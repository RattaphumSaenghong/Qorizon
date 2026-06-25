import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { InventoryItem, Prisma } from '@prisma/client';
import type { BookingType, InventoryItemRow, InventoryStatus } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { FxService } from '../fx/fx.service';
import { IngestEmailDto } from './dto/ingest-email.dto';
import { parseJsonLd, type ParsedInventory } from './parsers/jsonld.parser';
import { parseWithAnthropic } from './parsers/llm.parser';

@Injectable()
export class IngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly config: ConfigService,
    private readonly fx: FxService,
  ) {}

  async ingestEmail(dto: IngestEmailDto): Promise<InventoryItemRow> {
    this.assertSignature(dto);
    const user = await this.findRecipient(dto);
    const thbRate = await this.fx.usdToThb();
    const parsed =
      parseJsonLd(dto.body_html, thbRate) ??
      this.parseHeuristic(dto.subject, dto.body_text ?? '') ??
      (await parseWithAnthropic(this.config, dto.subject, dto.body_text ?? ''));
    if (!parsed) throw new BadRequestException('could not parse travel confirmation');

    const item = await this.prisma.inventoryItem.create({
      data: {
        user_id: user.id,
        source: 'email_forward',
        type: parsed.type,
        raw_payload: {
          from: dto.from,
          to: dto.to ?? null,
          subject: dto.subject,
          body_text: dto.body_text ?? null,
          body_html: dto.body_html ?? null,
        } as Prisma.InputJsonValue,
        parsed: parsed as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.notification.create({
      data: { user_id: user.id, type: 'inventory_item' },
    });
    return toInventoryRow(item);
  }

  async list(userId: string, type?: string): Promise<InventoryItemRow[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { user_id: userId, status: 'unmatched', ...(type ? { type } : {}) },
      orderBy: { received_at: 'desc' },
    });
    return items.map(toInventoryRow);
  }

  async match(userId: string, id: string, tripId: string): Promise<InventoryItemRow> {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, user_id: userId } });
    if (!item) throw new NotFoundException('inventory item not found');
    await this.policy.assertCanEditTrip(userId, tripId);
    const parsed = item.parsed as unknown as ParsedInventory;
    const amount = Number(parsed.amount_thb ?? 0);

    const matched = await this.prisma.$transaction(async (tx) => {
      const stop = await tx.stop.create({
        data: {
          trip_id: tripId,
          user_id: userId,
          status: 'planned',
          scope: 'assigned',
          category: item.type,
          location_name: parsed.title ?? parsed.hotel_name ?? null,
          planned_start: parsed.dep_time ?? parsed.check_in ?? null,
          planned_end: parsed.arr_time ?? parsed.check_out ?? null,
          cost: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : undefined,
          notes: this.notesFromParsed(parsed),
          assignees: { create: [{ user_id: userId }] },
        },
      });
      await tx.booking.create({
        data: {
          user_id: userId,
          trip_id: tripId,
          stop_id: stop.id,
          type: item.type,
          provider: 'email',
          external_ref: parsed.ref,
          status: 'confirmed',
          amount_thb: Number.isFinite(amount) && amount > 0 ? amount : undefined,
          commission_thb: 0,
          raw_payload: { title: parsed.title, parsed } as unknown as Prisma.InputJsonValue,
        },
      });
      return tx.inventoryItem.update({
        where: { id },
        data: { status: 'matched', matched_stop_id: stop.id },
      });
    });
    return toInventoryRow(matched);
  }

  async dismiss(userId: string, id: string): Promise<InventoryItemRow> {
    const item = await this.prisma.inventoryItem.updateMany({
      where: { id, user_id: userId },
      data: { status: 'dismissed' },
    });
    if (item.count === 0) throw new NotFoundException('inventory item not found');
    const dismissed = await this.prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
    return toInventoryRow(dismissed);
  }

  private assertSignature(dto: IngestEmailDto): void {
    const secret = this.config.get<string>('INBOUND_EMAIL_SIGNING_SECRET');
    if (!secret) {
      // DECISION NEEDED before production: configure this to the inbound email provider secret.
      if (this.config.get('NODE_ENV') === 'production') {
        throw new ForbiddenException('inbound signing secret not configured');
      }
      return;
    }
    if (!dto.signature) throw new ForbiddenException('missing inbound signature');
    const payload = `${dto.from}\n${dto.to ?? ''}\n${dto.subject}\n${dto.body_text ?? ''}\n${dto.body_html ?? ''}`;
    const digest = createHmac('sha256', secret).update(payload).digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(dto.signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('invalid inbound signature');
    }
  }

  private async findRecipient(dto: IngestEmailDto) {
    const localPart = dto.to?.match(/<?([^@<>\s]+)@/)?.[1] ?? dto.subject.match(/\bfor:([a-zA-Z0-9_.-]+)/)?.[1];
    const token = localPart?.split('-').pop();
    if (!token) throw new BadRequestException('could not identify recipient');
    const user = await this.prisma.user.findFirst({ where: { forwarding_token: token } });
    if (!user) throw new NotFoundException('recipient not found');
    return user;
  }

  private parseHeuristic(subject: string, bodyText: string): ParsedInventory | null {
    const text = `${subject}\n${bodyText}`;
    const flight = text.match(/\b([A-Z]{3})\s*(?:->|to|-)\s*([A-Z]{3})\b/);
    if (/flight|airline|boarding|departure/i.test(text) && flight) {
      return {
        type: 'flight',
        title: `${flight[1]} -> ${flight[2]}`,
        origin: flight[1],
        destination: flight[2],
        ref: text.match(/\b(?:booking|confirmation|ref)\s*[:#]?\s*([A-Z0-9-]{5,})/i)?.[1],
      };
    }
    if (/hotel|reservation|check-?in|stay/i.test(text)) {
      const hotel = text.match(/(?:hotel|stay)\s*[:#-]?\s*([^\n]+)/i)?.[1]?.trim();
      return {
        type: 'hotel',
        title: hotel ?? 'Hotel stay',
        hotel_name: hotel,
        ref: text.match(/\b(?:booking|confirmation|ref)\s*[:#]?\s*([A-Z0-9-]{5,})/i)?.[1],
      };
    }
    return null;
  }

  private notesFromParsed(parsed: ParsedInventory): string | null {
    if (parsed.type === 'flight') {
      return [parsed.origin && parsed.destination ? `${parsed.origin} -> ${parsed.destination}` : null, parsed.ref ? `Ref ${parsed.ref}` : null]
        .filter(Boolean)
        .join(' · ') || null;
    }
    return [parsed.nights ? `${parsed.nights} nights` : null, parsed.ref ? `Ref ${parsed.ref}` : null]
      .filter(Boolean)
      .join(' · ') || null;
  }
}

function toInventoryRow(i: InventoryItem): InventoryItemRow {
  return {
    id: i.id,
    user_id: i.user_id,
    source: i.source,
    type: i.type as BookingType,
    parsed: i.parsed as Record<string, unknown>,
    status: i.status as InventoryStatus,
    matched_stop_id: i.matched_stop_id,
    received_at: i.received_at.toISOString(),
  };
}

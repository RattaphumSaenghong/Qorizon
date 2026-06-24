import { Injectable } from '@nestjs/common';
import type { LiveBatch, TrailPoint } from '@prisma/client';
import type { LiveBatchRow, TrailPointRow, TripRow } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { StopsService } from '../stops/stops.service';
import { toTripRow } from '../trips/trip.mapper';
import { SetLiveModeDto } from './dto/set-live-mode.dto';
import { PostTrailDto } from './dto/post-trail.dto';
import { PublishBatchDto } from './dto/publish-batch.dto';

@Injectable()
export class LiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly stops: StopsService,
  ) {}

  /** Toggle live mode. Affects the temporal feed gate, so eligibility is recomputed. */
  async setLiveMode(userId: string, tripId: string, dto: SetLiveModeDto): Promise<TripRow> {
    await this.policy.assertOwnsTrip(userId, tripId);
    const trip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        live_mode: dto.live_mode,
        ...(dto.live_cadence ? { live_cadence: dto.live_cadence } : {}),
      },
    });
    await this.stops.recomputeTripFeedEligibility(tripId);
    return toTripRow(trip);
  }

  /** Append GPS trail points, then recompute the feed gate (new trail may let a stop pass the 1km rule). */
  async addTrail(userId: string, tripId: string, dto: PostTrailDto): Promise<{ inserted: number }> {
    await this.policy.assertCanEditTrip(userId, tripId);
    await this.prisma.trailPoint.createMany({
      data: dto.points.map((p) => ({
        trip_id: tripId,
        user_id: userId,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        recorded_at: p.recorded_at ? new Date(p.recorded_at) : undefined,
      })),
    });
    await this.stops.recomputeTripFeedEligibility(tripId);
    return { inserted: dto.points.length };
  }

  async getTrail(userId: string | null, tripId: string, member?: string | null): Promise<TrailPointRow[]> {
    await this.policy.assertCanReadTrip(userId, tripId);
    const points = await this.prisma.trailPoint.findMany({
      where: { trip_id: tripId, ...(member ? { user_id: member } : {}) },
      orderBy: { recorded_at: 'asc' },
    });
    return points.map(toTrailPointRow);
  }

  /**
   * Publish a live batch (the daily digest pushed to followers). Groups the
   * given stops (or that day's visited stops), then fans out notifications.
   */
  async publishBatch(userId: string, tripId: string, dto: PublishBatchDto): Promise<LiveBatchRow> {
    await this.policy.assertOwnsTrip(userId, tripId);

    const batchDate = dto.batch_date ?? new Date().toISOString().slice(0, 10);

    let stopIds = dto.stop_ids;
    if (!stopIds) {
      const visited = await this.prisma.stop.findMany({
        where: { trip_id: tripId, status: 'visited' },
        select: { id: true, captured_at: true },
      });
      stopIds = visited
        .filter((s) => s.captured_at && s.captured_at.toISOString().slice(0, 10) === batchDate)
        .map((s) => s.id);
    }

    const now = new Date();
    const batch = await this.prisma.liveBatch.create({
      data: {
        trip_id: tripId,
        batch_date: new Date(batchDate),
        title: dto.title,
        stop_ids: stopIds,
        published_at: now,
        notified_at: now,
      },
    });

    // link the stops to the batch
    if (stopIds.length > 0) {
      await this.prisma.stop.updateMany({
        where: { id: { in: stopIds } },
        data: { batch_date: new Date(batchDate) },
      });
    }

    // fan out notifications to the owner's followers
    const owner = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: { user_id: true },
    });
    const followers = await this.prisma.follow.findMany({
      where: { following_id: owner.user_id },
      select: { follower_id: true },
    });
    if (followers.length > 0) {
      await this.prisma.notification.createMany({
        data: followers.map((f) => ({
          user_id: f.follower_id,
          type: 'live_batch',
          actor_id: owner.user_id,
          trip_id: tripId,
          batch_id: batch.id,
        })),
      });
    }

    return toLiveBatchRow(batch);
  }

  async getBatches(userId: string | null, tripId: string): Promise<LiveBatchRow[]> {
    await this.policy.assertCanReadTrip(userId, tripId);
    const batches = await this.prisma.liveBatch.findMany({
      where: { trip_id: tripId },
      orderBy: { batch_date: 'desc' },
    });
    return batches.map(toLiveBatchRow);
  }
}

function toTrailPointRow(p: TrailPoint): TrailPointRow {
  return {
    id: p.id,
    trip_id: p.trip_id,
    user_id: p.user_id,
    latitude: p.latitude,
    longitude: p.longitude,
    altitude: p.altitude,
    recorded_at: p.recorded_at.toISOString(),
  };
}

function toLiveBatchRow(b: LiveBatch): LiveBatchRow {
  return {
    id: b.id,
    trip_id: b.trip_id,
    batch_date: b.batch_date.toISOString().slice(0, 10),
    title: b.title,
    stop_ids: b.stop_ids,
    published_at: b.published_at ? b.published_at.toISOString() : null,
    notified_at: b.notified_at ? b.notified_at.toISOString() : null,
    created_at: b.created_at.toISOString(),
  };
}

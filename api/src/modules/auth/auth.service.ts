import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { AuthResponse, AuthUser } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;
const REFRESH_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('email already registered');

    const username = await this.resolveUsername(dto.username, dto.email);
    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash,
        username,
        forwarding_token: this.newForwardingToken(),
        display_name: dto.display_name ?? username,
        language: dto.language ?? 'th',
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('invalid credentials');

    return this.buildAuthResponse(user);
  }

  /** Rotate: validate the presented refresh token, revoke it, issue a fresh pair. */
  async refresh(rawToken: string): Promise<AuthResponse> {
    const [tokenId, secret] = rawToken.split('.');
    if (!tokenId || !secret) throw new UnauthorizedException('invalid refresh token');

    const row = await this.prisma.refreshToken.findUnique({ where: { id: tokenId } });
    if (!row || row.revoked || row.expires_at < new Date()) {
      throw new UnauthorizedException('invalid refresh token');
    }

    const ok = await bcrypt.compare(secret, row.token_hash);
    if (!ok) throw new UnauthorizedException('invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: row.user_id },
    });
    return this.buildAuthResponse(user);
  }

  async logout(rawToken: string): Promise<void> {
    const [tokenId] = rawToken.split('.');
    if (!tokenId) return;
    await this.prisma.refreshToken
      .update({ where: { id: tokenId }, data: { revoked: true } })
      .catch(() => undefined);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toAuthUser(user);
  }

  // ── helpers ──────────────────────────────────────────────────────────

  /** Ports handle_new_user(): derive a unique handle from the email local-part. */
  private async resolveUsername(requested: string | undefined, email: string): Promise<string> {
    if (requested) {
      const taken = await this.prisma.user.findUnique({ where: { username: requested } });
      if (taken) throw new ConflictException('username already taken');
      return requested;
    }
    let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (base === '') base = 'traveller';
    // append a short random suffix to avoid collisions, like the old trigger
    return `${base}.${randomBytes(2).toString('hex')}`;
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const access_token = this.jwt.sign({ sub: user.id });
    const refresh_token = await this.issueRefreshToken(user.id);
    return { access_token, refresh_token, user: this.toAuthUser(user) };
  }

  /** Opaque "<id>.<secret>"; only the bcrypt hash of the secret is stored. */
  private async issueRefreshToken(userId: string): Promise<string> {
    const id = randomUUID();
    const secret = randomBytes(32).toString('hex');
    const token_hash = await bcrypt.hash(secret, BCRYPT_ROUNDS);
    const expires_at = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { id, user_id: userId, token_hash, expires_at },
    });
    return `${id}.${secret}`;
  }

  private newForwardingToken(): string {
    return randomBytes(9).toString('base64url');
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      username: user.username,
      forwarding_token: user.forwarding_token,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      real_name: user.real_name,
      phone: user.phone, // your own phone is always returned to you
      language: user.language as AuthUser['language'],
      follower_count: user.follower_count,
      following_count: user.following_count,
      created_at: user.created_at.toISOString(),
    };
  }
}

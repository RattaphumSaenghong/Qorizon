import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Populates req.user when a valid Bearer token is present, but never rejects
 * when it's absent/invalid. Use with @Public() so the global guard steps aside.
 * Lets public reads (e.g. a public trip) work logged-out yet see more when authed.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Swallow the "no token" error; return null user instead of throwing.
  handleRequest<TUser = { userId: string } | null>(_err: unknown, user: TUser): TUser {
    return (user ?? null) as TUser;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // ignore — anonymous access is allowed
    }
    return true;
  }
}

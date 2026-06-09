import { applyDecorators, UseGuards } from '@nestjs/common';
import { Public } from './public.decorator';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';

/**
 * A public endpoint that still populates req.user when a Bearer token is present.
 * Combines @Public() (steps the global JwtAuthGuard aside) with the
 * OptionalJwtAuthGuard (decodes a token if there is one, never rejects).
 */
export const PublicRead = () => applyDecorators(Public(), UseGuards(OptionalJwtAuthGuard));

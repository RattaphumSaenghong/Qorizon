import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The authenticated user's id, taken from the validated JWT (never the body). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.userId;
  },
);

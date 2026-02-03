import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const req = ctx.switchToHttp().getRequest();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return req.user as UserContext | undefined;
  },
);

import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.types.js';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

  if (!request.user) {
    throw new Error('Authenticated user is not available on the request');
  }

  return request.user;
});

import { AuthenticationError } from 'apollo-server-express';
import type { Request } from 'express';
import { extractUser, type AuthUser } from '../services/auth.service.js';

export interface GqlContext {
  user: AuthUser;
}

export function buildContext({ req }: { req: Request }): GqlContext {
  try {
    const user = extractUser(req.headers.authorization);
    return { user };
  } catch (e) {
    throw new AuthenticationError((e as Error).message);
  }
}
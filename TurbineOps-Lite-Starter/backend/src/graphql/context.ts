import { AuthenticationError } from 'apollo-server-express';
import type { Request } from 'express';
import { extractUser, type AuthUser } from '../services/auth.service.js';

export interface GqlContext {
  user: AuthUser;
}

// Any logged-in role may read, so this only checks that the token is valid
export function buildContext({ req }: { req: Request }): GqlContext {
  try {
    return { user: extractUser(req.headers.authorization) };
  } catch (e) {
    throw new AuthenticationError((e as Error).message);
  }
}
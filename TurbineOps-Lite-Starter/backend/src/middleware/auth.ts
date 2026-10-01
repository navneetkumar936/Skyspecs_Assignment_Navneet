import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { extractUser, type AuthUser } from '../services/auth.service.js';
import { AppError } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  req.user = extractUser(req.headers.authorization);
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to perform this action');
    }
    next();
  };

// ADMIN has full access, ENGINEER creates and edits, VIEWER is read-only.
export const canWrite = requireRole('ADMIN', 'ENGINEER');
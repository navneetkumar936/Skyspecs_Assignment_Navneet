import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../../utils/errors.js';

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params || {});
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query || {});
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body || {});
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issue = err.issues[0];
        const message = issue ? issue.message : 'Invalid request data';
        return next(new AppError(400, message));
      }
      next(err);
    }
  };
}

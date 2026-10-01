import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandlers.js';
import { authenticate } from '../../middleware/auth.js';
import { getMe, login } from '../../services/auth.service.js';
import { validate } from './validate.js';
import { loginSchema } from './schemas/auth.schema.js';

export const authRoutes = Router();

authRoutes.post('/login', validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  res.json(await login(email, password));
}));

authRoutes.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json(await getMe(req.user!.id));
}));

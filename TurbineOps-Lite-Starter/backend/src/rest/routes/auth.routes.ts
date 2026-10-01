import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandlers';
import { authenticate } from '../../middleware/auth';
import { getMe, login } from '../../services/auth.service';

export const authRoutes = Router();

authRoutes.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  res.json(await login(email, password));
}));

authRoutes.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json(await getMe(req.user!.id));
}));

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandlers';
import { createTurbine, listTurbines, updateTurbine } from '../../services/turbine.service';
import { adminOnly } from '../../middleware/auth';

export const turbineRoutes = Router();

turbineRoutes.get('/', asyncHandler(async (_req, res) => {
  res.json(await listTurbines());
}));

turbineRoutes.post('/', adminOnly, asyncHandler(async (req, res) => {
  res.status(201).json(await createTurbine(req.body || {}));
}));

turbineRoutes.patch('/:id', adminOnly, asyncHandler(async (req, res) => {
  res.json(await updateTurbine(req.params.id, req.body || {}));
}));

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandlers.js';
import { createTurbine, listTurbines, updateTurbine } from '../../services/turbine.service.js';
import { adminOnly } from '../../middleware/auth.js';
import { validate } from './validate.js';
import {
  createTurbineSchema,
  turbineIdParamSchema,
  updateTurbineSchema,
} from './schemas/turbine.schema.js';

export const turbineRoutes = Router();

turbineRoutes.get('/', asyncHandler(async (_req, res) => {
  res.json(await listTurbines());
}));

turbineRoutes.post('/', adminOnly, validate({ body: createTurbineSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await createTurbine(req.body));
}));

turbineRoutes.patch('/:id', adminOnly, validate({ params: turbineIdParamSchema, body: updateTurbineSchema }), asyncHandler(async (req, res) => {
  res.json(await updateTurbine(req.params.id, req.body));
}));

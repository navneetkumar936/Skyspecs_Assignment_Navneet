import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandlers';
import { AppError } from '../../utils/errors.js';
import {
  createInspection, getInspection, listInspections, updateInspection,
} from '../../services/inspection.service.js';
import { createFinding } from '../../services/finding.service.js';
import { deleteRepairPlan, generateRepairPlan } from '../../services/repairPlan.service.js';
import { canWrite } from '../../middleware/auth';

export const inspectionRoutes = Router();

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

inspectionRoutes.get('/', asyncHandler(async (req, res) => {
  res.json(await listInspections({
    from: str(req.query.from),
    to: str(req.query.to),
    turbineId: str(req.query.turbineId),
    dataSource: str(req.query.dataSource),
  }));
}));

inspectionRoutes.post('/', canWrite, asyncHandler(async (req, res) => {
  res.status(201).json(await createInspection(req.body || {}));
}));

inspectionRoutes.get('/:id', asyncHandler(async (req, res) => {
  const i = await getInspection(req.params.id);
  if (!i) throw new AppError(404, 'Inspection not found');
  res.json(i);
}));

inspectionRoutes.patch('/:id', canWrite, asyncHandler(async (req, res) => {
  res.json(await updateInspection(req.params.id, req.body || {}));
}));

inspectionRoutes.post('/:id/findings', canWrite, asyncHandler(async (req, res) => {
  res.status(201).json(await createFinding(req.params.id, req.body || {}));
}));

inspectionRoutes.post('/:id/repair-plan', canWrite, asyncHandler(async (req, res) => {
  res.status(201).json(await generateRepairPlan(req.params.id));
}));

inspectionRoutes.delete('/:id/repair-plan', canWrite, asyncHandler(async (req, res) => {
  await deleteRepairPlan(req.params.id);
  res.status(204).end();
}));
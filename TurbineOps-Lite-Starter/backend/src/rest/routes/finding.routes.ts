import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandlers';
import { searchFindings, updateFinding } from '../../services/finding.service';
import { canWrite } from '../../middleware/auth';

export const findingRoutes = Router();

findingRoutes.patch('/:id', canWrite, asyncHandler(async (req, res) => {
  res.json(await updateFinding(req.params.id, req.body || {}));
}));

findingRoutes.get('/', asyncHandler(async (req, res) => {
  const inspectionId = typeof req.query.inspectionId === 'string' ? req.query.inspectionId : undefined;
  res.json(await searchFindings(req.query.q, inspectionId));
}));
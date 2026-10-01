import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandlers.js';
import { searchFindings, updateFinding } from '../../services/finding.service.js';
import { canWrite } from '../../middleware/auth.js';
import { validate } from './validate.js';
import {
  findingIdParamSchema,
  searchFindingsQuerySchema,
  updateFindingSchema,
} from './schemas/finding.schema.js';

export const findingRoutes = Router();

findingRoutes.patch('/:id', canWrite, validate({ params: findingIdParamSchema, body: updateFindingSchema }), asyncHandler(async (req, res) => {
  res.json(await updateFinding(req.params.id, req.body));
}));

findingRoutes.get('/', validate({ query: searchFindingsQuerySchema }), asyncHandler(async (req, res) => {
  const inspectionId = typeof req.query.inspectionId === 'string' ? req.query.inspectionId : undefined;
  res.json(await searchFindings(req.query.q, inspectionId));
}));
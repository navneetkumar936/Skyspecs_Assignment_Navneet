import { FindingCategory } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { logAudit } from '../db/mongo.js';
import { AppError } from '../utils/errors.js';

const CATEGORIES = Object.values(FindingCategory);
const LOCKED_MSG = 'Inspection is locked because a repair plan exists. Delete the plan to edit findings.';

export function validateSeverity(v: unknown): number {
  if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 5) {
    throw new AppError(400, 'severity must be an integer between 1 and 5');
  }
  return v as number;
}

function validateCategory(v: unknown): FindingCategory {
  if (!CATEGORIES.includes(v as FindingCategory)) {
    throw new AppError(400, `category must be one of: ${CATEGORIES.join(', ')}`);
  }
  return v as FindingCategory;
}

function validateCost(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    throw new AppError(400, 'estimatedCost must be a number >= 0');
  }
  return v;
}

export function applyCrackRule(category: FindingCategory, notes: string | null | undefined, severity: number) {
  const hasCrack = (notes ?? '').toLowerCase().includes('crack');
  return category === 'BLADE_DAMAGE' && hasCrack ? Math.max(4, severity) : severity;
}

export interface FindingInput {
  category?: string;
  severity?: number;
  estimatedCost?: number;
  notes?: string | null;
}

export async function createFinding(inspectionId: string, input: FindingInput) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: { repairPlan: { select: { id: true } } },
  });
  if (!inspection) throw new AppError(404, 'Inspection not found');
  if (inspection.repairPlan) throw new AppError(409, LOCKED_MSG);

  const category = validateCategory(input.category);
  const severity = applyCrackRule(category, input.notes, validateSeverity(input.severity));
  const estimatedCost = validateCost(input.estimatedCost);

  const finding = await prisma.finding.create({
    data: { inspectionId, category, severity, estimatedCost, notes: input.notes ?? null },
  });
  await logAudit({ kind: 'FINDING_CREATED', inspectionId, findingId: finding.id, severity });
  return finding;
}

export async function updateFinding(id: string, input: FindingInput) {
  const existing = await prisma.finding.findUnique({
    where: { id },
    include: { inspection: { include: { repairPlan: { select: { id: true } } } } },
  });
  if (!existing) throw new AppError(404, 'Finding not found');
  if (existing.inspection.repairPlan) throw new AppError(409, LOCKED_MSG);

  const category = input.category !== undefined ? validateCategory(input.category) : existing.category;
  const notes = input.notes !== undefined ? input.notes : existing.notes;
  const baseSeverity = input.severity !== undefined ? validateSeverity(input.severity) : existing.severity;
  const severity = applyCrackRule(category, notes, baseSeverity);
  const estimatedCost = input.estimatedCost !== undefined ? validateCost(input.estimatedCost) : existing.estimatedCost;

  const updated = await prisma.finding.update({
    where: { id },
    data: { category, notes, severity, estimatedCost },
  });
  await logAudit({ kind: 'FINDING_UPDATED', inspectionId: existing.inspectionId, findingId: id, severity });
  return updated;
}

export async function searchFindings(q: unknown) {
  const term = typeof q === 'string' ? q.trim() : '';
  if (!term) throw new AppError(400, 'q is required');
  return prisma.finding.findMany({
    where: { notes: { contains: term, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { inspection: { include: { turbine: true, repairPlan: true } } },
  });
}

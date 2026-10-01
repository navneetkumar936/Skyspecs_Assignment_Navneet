import { prisma } from '../db/prisma.js';
import { logAudit } from '../db/mongo.js';
import { publish } from './events.service.js';
import { AppError } from '../utils/errors.js';

export async function generateRepairPlan(inspectionId: string) {
  const inspection: any = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: { findings: true },
  });
  if (!inspection) throw new AppError(404, 'Inspection not found');
  if (inspection.repairPlan) {
    throw new AppError(409, 'A repair plan already exists. Delete it first to regenerate.');
  }

  const findings = inspection?.findings || [];

  const total = findings.reduce((s, f) => s + Number(f.estimatedCost || 0), 0);
  const maxSeverity = Math.max(0, ...findings.map((f) => f.severity));
  const priority = maxSeverity == 5 ? 'HIGH' : maxSeverity >= 3 ? 'MEDIUM' : 'LOW';

  const data = {
    priority: priority as 'HIGH' | 'MEDIUM' | 'LOW',
    totalEstimatedCost: total,
    maxSeverity,
    findingCount: findings.length,
    snapshotJson: findings,
  };

  const plan = await prisma.repairPlan.upsert({
    where: { inspectionId },
    update: data,
    create: { inspectionId, ...data },
  });

  publish('plan', { inspectionId, at: new Date().toISOString() });
  await logAudit({ kind: 'PLAN_GENERATED', inspectionId, total, priority });
  return plan;
}

export async function deleteRepairPlan(inspectionId: string) {
  const plan = await prisma.repairPlan.findUnique({ where: { inspectionId } });
  if (!plan) throw new AppError(404, 'No repair plan for this inspection');
  await prisma.repairPlan.delete({ where: { inspectionId } });
  publish('plan', { inspectionId, status: 'deleted', at: new Date().toISOString() });
  await logAudit({ kind: 'PLAN_DELETED', inspectionId });
}

export const getRepairPlan = (inspectionId: string) =>
  prisma.repairPlan.findUnique({ where: { inspectionId } });
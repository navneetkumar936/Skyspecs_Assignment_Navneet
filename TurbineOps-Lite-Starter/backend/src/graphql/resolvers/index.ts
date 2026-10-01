import { prisma } from '../../db/prisma.js';
import { getInspection, listInspections } from '../../services/inspection.service.js';
import { searchFindings } from '../../services/finding.service.js';
import { listTurbines } from '../../services/turbine.service.js';
import { getRepairPlan } from '../../services/repairPlan.service.js';

export const resolvers = {
  Query: {
    turbines: () => listTurbines(),
    inspection: (_: unknown, { id }: { id: string }) => getInspection(id),
    inspections: (_: unknown, args: any) => listInspections(args),
    repairPlan: (_: unknown, { inspectionId }: { inspectionId: string }) => getRepairPlan(inspectionId),
    searchFindings: (_: unknown, { q, inspectionId }: { q: string, inspectionId?: string }) => searchFindings(q, inspectionId),
  },
  // Field resolvers: list queries don't include findings or inspections
  Inspection: {
    date: (i: { date: Date }) => i.date.toISOString().slice(0, 10),
    findings: (i: { id: string; findings?: unknown[] }) =>
      i.findings ?? prisma.finding.findMany({ where: { inspectionId: i.id }, orderBy: { createdAt: 'asc' } }),
  },
  Turbine: {
    inspections: (t: { id: string }) =>
      prisma.inspection.findMany({ where: { turbineId: t.id }, orderBy: { date: 'desc' } }),
  },
  Finding: {
    inspection: (f: any) => f.inspection ?? getInspection(f.inspectionId),
  },
  RepairPlan: { createdAt: (p: { createdAt: Date }) => p.createdAt.toISOString() },
};
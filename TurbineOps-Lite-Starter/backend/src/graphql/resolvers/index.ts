import { getInspection, listInspections, createInspection } from '../../services/inspection.service.js';
import { createFinding, searchFindings, updateFinding } from '../../services/finding.service.js';
import { deleteRepairPlan, generateRepairPlan, getRepairPlan } from '../../services/repairPlan.service.js';

export const resolvers = {
  Query: {
    inspection: (_: unknown, { id }: { id: string }) => getInspection(id),
    inspections: (_: unknown, args: any) => listInspections(args),
    repairPlan: (_: unknown, { inspectionId }: { inspectionId: string }) => getRepairPlan(inspectionId),
    searchFindings: (_: unknown, { q }: { q: string }) => searchFindings(q),
  },
  Mutation: {
    createInspection: (_: unknown, { input }: any) => createInspection(input),
    createFinding: (_: unknown, { inspectionId, input }: any) => createFinding(inspectionId, input),
    updateFinding: (_: unknown, { id, input }: any) => updateFinding(id, input),
    generateRepairPlan: (_: unknown, { inspectionId }: { inspectionId: string }) => generateRepairPlan(inspectionId),
    deleteRepairPlan: async (_: unknown, { inspectionId }: { inspectionId: string }) => {
      await deleteRepairPlan(inspectionId);
      return true;
    },
  },
  Inspection: { date: (i: { date: Date }) => i.date.toISOString().slice(0, 10) },
  RepairPlan: { createdAt: (p: { createdAt: Date }) => p.createdAt.toISOString() },
  Finding: {
    inspection: (f: any) => f.inspection ?? getInspection(f.inspectionId),
  },
};
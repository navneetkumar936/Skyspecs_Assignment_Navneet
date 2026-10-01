import { DataSource, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { logAudit } from '../db/mongo.js';
import { AppError, isUniqueViolation } from '../utils/errors.js';

const DATA_SOURCES = Object.values(DataSource);
const OVERLAP_MSG = 'An inspection already exists for this turbine on this date';

function parseDate(v: unknown): Date {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new AppError(400, 'date must be YYYY-MM-DD');
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new AppError(400, 'invalid date');
  return d;
}

function parseDataSource(v: unknown): DataSource {
  if (!DATA_SOURCES.includes(v as DataSource)) {
    throw new AppError(400, `dataSource must be one of: ${DATA_SOURCES.join(', ')}`);
  }
  return v as DataSource;
}

export interface InspectionInput {
  turbineId?: string;
  date?: string;
  inspectorName?: string;
  dataSource?: string;
  rawPackageUrl?: string;
}

export interface InspectionFilters {
  from?: string;
  to?: string;
  turbineId?: string;
  dataSource?: string;
}

export function listInspections(f: InspectionFilters = {}) {
  const condn: Prisma.InspectionWhereInput = {};
  if (f.turbineId) condn.turbineId = f.turbineId;
  if (f.dataSource) condn.dataSource = parseDataSource(f.dataSource);
  if (f.from || f.to) {
    condn.date = {
      ...(f.from ? { gte: parseDate(f.from) } : {}),
      ...(f.to ? { lte: parseDate(f.to) } : {}),
    };
  }
  return prisma.inspection.findMany({
    where: condn,
    orderBy: { date: 'desc' },
    include: { turbine: true, repairPlan: true },
  });
}

export function getInspection(id: string) {
  return prisma.inspection.findUnique({
    where: { id },
    include: { turbine: true, findings: true, repairPlan: true },
  });
}

export async function createInspection(input: InspectionInput) {
  if (!input.turbineId) throw new AppError(400, 'turbineId is required');
  const date = parseDate(input.date);
  const dataSource = parseDataSource(input.dataSource);

  const turbine = await prisma.turbine.findUnique({ where: { id: input.turbineId } });
  if (!turbine) throw new AppError(404, 'Turbine not found');

  try {
    const created = await prisma.inspection.create({
      data: {
        turbineId: input.turbineId,
        date,
        dataSource,
        inspectorName: input.inspectorName,
        rawPackageUrl: input.rawPackageUrl,
      },
    });
    await logAudit({ kind: 'INSPECTION_CREATED', inspectionId: created.id, turbineId: created.turbineId });
    return created;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(409, OVERLAP_MSG);
    throw e;
  }
}

export async function updateInspection(id: string, input: InspectionInput) {
  const existing = await prisma.inspection.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Inspection not found');

  const data: Prisma.InspectionUpdateInput = {};
  if (input.date !== undefined) data.date = parseDate(input.date);
  if (input.dataSource !== undefined) data.dataSource = parseDataSource(input.dataSource);
  if (input.inspectorName !== undefined) data.inspectorName = input.inspectorName;
  if (input.rawPackageUrl !== undefined) data.rawPackageUrl = input.rawPackageUrl;

  try {
    const updated = await prisma.inspection.update({ where: { id }, data });
    await logAudit({ kind: 'INSPECTION_UPDATED', inspectionId: id, fields: Object.keys(data) });
    return updated;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(409, OVERLAP_MSG);
    throw e;
  }
}
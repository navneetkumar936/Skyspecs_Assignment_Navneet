jest.mock('../../src/db/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    turbine: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    inspection: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    finding: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    repairPlan: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock('../../src/db/mongo', () => ({ logAudit: jest.fn() }));

import { Prisma } from '@prisma/client';
import { prisma } from '../../src/db/prisma';
import { createInspection, listInspections, updateInspection } from '../../src/services/inspection.service';

const db = prisma as any;
const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

const valid = { turbineId: 't1', date: '2026-10-01', dataSource: 'DRONE', inspectorName: 'Asha' };

describe('createInspection', () => {
  beforeEach(() => {
    db.turbine.findUnique.mockResolvedValue({ id: 't1' });
    db.inspection.create.mockImplementation(async ({ data }: any) => ({ id: 'i1', ...data }));
  });

  it('creates an inspection with the date as midnight UTC', async () => {
    const r = await createInspection(valid);
    expect(r.id).toBe('i1');
    expect(db.inspection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ turbineId: 't1', dataSource: 'DRONE', date: new Date('2026-10-01T00:00:00.000Z') }),
    });
  });

  it('turns the unique-constraint violation into a friendly 409', async () => {
    db.inspection.create.mockRejectedValue(uniqueViolation());
    await expect(createInspection(valid)).rejects.toMatchObject({ status: 409, message: expect.stringContaining('already exists') });
  });

  it('rethrows unexpected database errors', async () => {
    db.inspection.create.mockRejectedValue(new Error('db down'));
    await expect(createInspection(valid)).rejects.toThrow('db down');
  });

  it('returns 404 for an unknown turbine', async () => {
    db.turbine.findUnique.mockResolvedValue(null);
    await expect(createInspection(valid)).rejects.toMatchObject({ status: 404 });
  });

  it.each([
    ['missing turbineId', { ...valid, turbineId: undefined }],
    ['bad date format', { ...valid, date: '01/10/2026' }],
    ['impossible date', { ...valid, date: '2026-13-45' }],
    ['unknown data source', { ...valid, dataSource: 'SATELLITE' }],
  ])('rejects %s with 400', async (_n, body) => {
    await expect(createInspection(body as any)).rejects.toMatchObject({ status: 400 });
    expect(db.inspection.create).not.toHaveBeenCalled();
  });
});

describe('updateInspection', () => {
  beforeEach(() => {
    db.inspection.findUnique.mockResolvedValue({ id: 'i1' });
    db.inspection.update.mockImplementation(async ({ data }: any) => ({ id: 'i1', ...data }));
  });

  it('returns 404 for an unknown inspection', async () => {
    db.inspection.findUnique.mockResolvedValue(null);
    await expect(updateInspection('i1', {})).rejects.toMatchObject({ status: 404 });
  });

  it('only updates the fields that were sent', async () => {
    await updateInspection('i1', { inspectorName: 'Ravi' });
    expect(db.inspection.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { inspectorName: 'Ravi' } });
  });

  it('returns 409 when the new date collides', async () => {
    db.inspection.update.mockRejectedValue(uniqueViolation());
    await expect(updateInspection('i1', { date: '2026-10-01' })).rejects.toMatchObject({ status: 409 });
  });
});

describe('listInspections filters', () => {
  beforeEach(() => db.inspection.findMany.mockResolvedValue([]));
  const whereOf = () => db.inspection.findMany.mock.calls[0][0].where;

  it('applies no filter by default and orders newest first', async () => {
    await listInspections();
    expect(whereOf()).toEqual({});
    expect(db.inspection.findMany.mock.calls[0][0].orderBy).toEqual({ date: 'desc' });
  });
  it('filters by turbine and data source', async () => {
    await listInspections({ turbineId: 't1', dataSource: 'MANUAL' });
    expect(whereOf()).toEqual({ turbineId: 't1', dataSource: 'MANUAL' });
  });
  it('filters by an inclusive date range', async () => {
    await listInspections({ from: '2026-10-01', to: '2026-10-31' });
    expect(whereOf().date).toEqual({
      gte: new Date('2026-10-01T00:00:00.000Z'),
      lte: new Date('2026-10-31T00:00:00.000Z'),
    });
  });
  it('supports a one-sided range', async () => {
    await listInspections({ to: '2026-09-30' });
    expect(whereOf().date).toEqual({ lte: new Date('2026-09-30T00:00:00.000Z') });
  });
  it('rejects an invalid data source', () => {
    expect(() => listInspections({ dataSource: 'NOPE' })).toThrow();
  });
});
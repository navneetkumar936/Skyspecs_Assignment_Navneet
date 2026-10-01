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

import { prisma } from '../../src/db/prisma';
import { createTurbine, updateTurbine } from '../../src/services/turbine.service';

const db = prisma as any;

describe('createTurbine', () => {
  it('requires a name', async () => {
    await expect(createTurbine({})).rejects.toMatchObject({ status: 400 });
    expect(db.turbine.create).not.toHaveBeenCalled();
  });
  it('creates a turbine', async () => {
    db.turbine.create.mockImplementation(async ({ data }: any) => ({ id: 't1', ...data }));
    const t = await createTurbine({ name: 'T-1', mwRating: 2.5 });
    expect(t).toMatchObject({ id: 't1', name: 'T-1', mwRating: 2.5 });
  });
});

describe('updateTurbine', () => {
  it('returns 404 for an unknown turbine', async () => {
    db.turbine.findUnique.mockResolvedValue(null);
    await expect(updateTurbine('t1', { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
  it('rejects an empty name', async () => {
    db.turbine.findUnique.mockResolvedValue({ id: 't1' });
    await expect(updateTurbine('t1', { name: '' })).rejects.toMatchObject({ status: 400 });
  });
  it('passes the fields to prisma', async () => {
    db.turbine.findUnique.mockResolvedValue({ id: 't1' });
    db.turbine.update.mockResolvedValue({ id: 't1' });
    await updateTurbine('t1', { mwRating: 3 });
    expect(db.turbine.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: expect.objectContaining({ mwRating: 3 }) });
  });
});
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
import {
  applyCrackRule, createFinding, searchFindings, updateFinding, validateSeverity,
} from '../../src/services/finding.service';
import { AppError } from '../../src/utils/errors';

const db = prisma as any;

async function statusOf(p: Promise<unknown>) {
  try { await p; return 200; } catch (e) { return (e as AppError).status; }
}

describe('applyCrackRule', () => {
  it('raises BLADE_DAMAGE with "crack" to at least 4', () => {
    expect(applyCrackRule('BLADE_DAMAGE', 'crack near tip', 2)).toBe(4);
  });
  it('is case-insensitive', () => {
    expect(applyCrackRule('BLADE_DAMAGE', 'Large CRACK found', 1)).toBe(4);
  });
  it('never lowers a higher severity', () => {
    expect(applyCrackRule('BLADE_DAMAGE', 'crack', 5)).toBe(5);
  });
  it('ignores other categories', () => {
    expect(applyCrackRule('LIGHTNING', 'crack', 2)).toBe(2);
  });
  it('ignores BLADE_DAMAGE without "crack"', () => {
    expect(applyCrackRule('BLADE_DAMAGE', 'surface wear', 2)).toBe(2);
  });
  it('handles missing notes', () => {
    expect(applyCrackRule('BLADE_DAMAGE', null, 2)).toBe(2);
    expect(applyCrackRule('BLADE_DAMAGE', undefined, 3)).toBe(3);
  });
});

describe('validateSeverity', () => {
  it.each([1, 2, 3, 4, 5])('accepts %i', (v) => expect(validateSeverity(v)).toBe(v));
  it.each([0, 6, -1, 2.5, '3', null, undefined])('rejects %p with 400', (bad) => {
    expect(() => validateSeverity(bad)).toThrow(AppError);
    try { validateSeverity(bad); } catch (e) { expect((e as AppError).status).toBe(400); }
  });
});

describe('createFinding', () => {
  const valid = { category: 'EROSION', severity: 2, estimatedCost: 100, notes: 'wear' };

  beforeEach(() => {
    db.inspection.findUnique.mockResolvedValue({ id: 'i1', repairPlan: null });
    db.finding.create.mockImplementation(async ({ data }: any) => ({ id: 'f1', ...data }));
  });

  it('returns 404 for an unknown inspection', async () => {
    db.inspection.findUnique.mockResolvedValue(null);
    expect(await statusOf(createFinding('i1', valid))).toBe(404);
  });

  it('returns 409 when the inspection is locked by a plan', async () => {
    db.inspection.findUnique.mockResolvedValue({ id: 'i1', repairPlan: { id: 'p1' } });
    await expect(createFinding('i1', valid)).rejects.toMatchObject({ status: 409 });
    expect(db.finding.create).not.toHaveBeenCalled();
  });

  it('stores the crack-rule severity', async () => {
    const f = await createFinding('i1', { category: 'BLADE_DAMAGE', severity: 2, estimatedCost: 5000, notes: 'Crack near tip' });
    expect(f.severity).toBe(4);
    expect(db.finding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ inspectionId: 'i1', severity: 4, category: 'BLADE_DAMAGE' }),
    });
  });

  it('keeps severity for non-crack findings', async () => {
    expect((await createFinding('i1', valid)).severity).toBe(2);
  });

  it.each([
    ['severity 9', { ...valid, severity: 9 }],
    ['unknown category', { ...valid, category: 'ALIENS' }],
    ['negative cost', { ...valid, estimatedCost: -1 }],
    ['missing cost', { category: 'EROSION', severity: 2 }],
  ])('rejects %s with 400 and does not save', async (_n, body) => {
    expect(await statusOf(createFinding('i1', body as any))).toBe(400);
    expect(db.finding.create).not.toHaveBeenCalled();
  });
});

describe('updateFinding', () => {
  const existing = (over = {}) => ({
    id: 'f1', inspectionId: 'i1', category: 'BLADE_DAMAGE', severity: 2, estimatedCost: 100, notes: 'scratch',
    inspection: { repairPlan: null }, ...over,
  });

  beforeEach(() => {
    db.finding.findUnique.mockResolvedValue(existing());
    db.finding.update.mockImplementation(async ({ data }: any) => ({ id: 'f1', ...data }));
  });

  it('returns 404 for an unknown finding', async () => {
    db.finding.findUnique.mockResolvedValue(null);
    expect(await statusOf(updateFinding('f1', { severity: 3 }))).toBe(404);
  });

  it('returns 409 when locked', async () => {
    db.finding.findUnique.mockResolvedValue(existing({ inspection: { repairPlan: { id: 'p1' } } }));
    expect(await statusOf(updateFinding('f1', { severity: 3 }))).toBe(409);
    expect(db.finding.update).not.toHaveBeenCalled();
  });

  it('raises severity when notes now mention a crack', async () => {
    expect((await updateFinding('f1', { notes: 'actually a crack' })).severity).toBe(4);
  });

  it('does not lower severity when the crack mention is removed', async () => {
    db.finding.findUnique.mockResolvedValue(existing({ severity: 4, notes: 'crack' }));
    expect((await updateFinding('f1', { notes: 'fine' })).severity).toBe(4);
  });

  it('keeps fields that were not sent', async () => {
    const f = await updateFinding('f1', { estimatedCost: 250 });
    expect(f).toMatchObject({ estimatedCost: 250, category: 'BLADE_DAMAGE', notes: 'scratch' });
  });

  it('rejects an out-of-range severity', async () => {
    expect(await statusOf(updateFinding('f1', { severity: 9 }))).toBe(400);
  });
});

describe('searchFindings', () => {
  beforeEach(() => db.finding.findMany.mockResolvedValue([]));

  it.each([undefined, '', '   ', 5])('requires q (%p)', async (q) => {
    expect(await statusOf(searchFindings(q))).toBe(400);
  });

  it('does a case-insensitive contains search', async () => {
    await searchFindings(' crack ');
    expect(db.finding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { notes: { contains: 'crack', mode: 'insensitive' } } }),
    );
  });

  it('can be scoped to one inspection', async () => {
    await searchFindings('crack', 'i1');
    expect(db.finding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { notes: { contains: 'crack', mode: 'insensitive' }, inspectionId: 'i1' } }),
    );
  });
});
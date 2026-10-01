import { applyCrackRule, validateSeverity } from '../src/services/finding.service.js';
import { addSseClient, publish } from '../src/services/events.service.js';
import { AppError } from '../src/utils/errors.js';

describe('crack rule', () => {
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
  it.each([1, 2, 3, 4, 5])('accepts %i', (v) => {
    expect(validateSeverity(v)).toBe(v);
  });
  it.each([0, 6, -1, 2.5, '3', null, undefined])('rejects %p with a 400', (bad) => {
    try {
      validateSeverity(bad);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(400);
    }
  });
});

describe('SSE publish', () => {
  it('writes SSE-formatted events and stops after a client disconnects', () => {
    const written: string[] = [];
    const handlers: Record<string, () => void> = {};
    const res: any = {
      write: (s: string) => written.push(s),
      on: (event: string, cb: () => void) => { handlers[event] = cb; },
    };
    addSseClient(res);

    publish('plan', { inspectionId: 'abc', status: 'generated' });
    expect(written).toEqual(['event: plan\ndata: {"inspectionId":"abc","status":"generated"}\n\n']);

    handlers.close();
    publish('plan', { inspectionId: 'abc', status: 'deleted' });
    expect(written).toHaveLength(1);
  });
});
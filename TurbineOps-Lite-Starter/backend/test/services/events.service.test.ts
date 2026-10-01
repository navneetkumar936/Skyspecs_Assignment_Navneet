import { addSseClient, publish } from '../../src/services/events.service';

describe('SSE events', () => {
  const makeClient = () => {
    const written: string[] = [];
    const handlers: Record<string, () => void> = {};
    const res: any = { write: (s: string) => written.push(s), on: (e: string, cb: () => void) => { handlers[e] = cb; } };
    return { res, written, handlers };
  };

  it('writes SSE-formatted events to every connected client', () => {
    const a = makeClient();
    const b = makeClient();
    addSseClient(a.res);
    addSseClient(b.res);
    publish('plan', { inspectionId: 'abc', status: 'generated' });
    const expected = 'event: plan\ndata: {"inspectionId":"abc","status":"generated"}\n\n';
    expect(a.written).toEqual([expected]);
    expect(b.written).toEqual([expected]);
    a.handlers.close();
    b.handlers.close();
  });

  it('stops writing to a client after it disconnects', () => {
    const c = makeClient();
    addSseClient(c.res);
    c.handlers.close();
    publish('plan', { inspectionId: 'abc' });
    expect(c.written).toHaveLength(0);
  });
});
import type { Response } from 'express';

const clients = new Set<Response>();

export function addSseClient(res: Response) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function publish(event: string, data: unknown) {
  for (const c of clients) c.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
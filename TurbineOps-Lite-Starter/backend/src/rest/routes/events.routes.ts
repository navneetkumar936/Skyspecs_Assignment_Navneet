import { Router } from 'express';
import { addSseClient } from '../../services/events.service.js';

export const eventsRoutes = Router();

eventsRoutes.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('event: ping\ndata: ok\n\n');
  addSseClient(res);
});
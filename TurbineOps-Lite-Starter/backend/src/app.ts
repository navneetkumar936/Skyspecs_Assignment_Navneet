import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { turbineRoutes } from './rest/routes/turbine.routes.js';
import { eventsRoutes } from './rest/routes/events.routes.js';
import { mountGraphql } from './graphql/server.js';
import { errorHandler } from './middleware/errorHandler.js';
import { inspectionRoutes } from './rest/routes/inspection.routes.js';
import { findingRoutes } from './rest/routes/finding.routes.js';
import { authRoutes } from './rest/routes/auth.routes.js';
import { authenticate } from './middleware/auth.js';

export async function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

  const openapiDoc = yaml.parse(readFileSync(path.join(process.cwd(), 'openapi.yaml'), 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/turbines', authenticate, turbineRoutes);
  app.use('/api/events', authenticate, eventsRoutes);
  app.use('/api/inspections', authenticate, inspectionRoutes);
  app.use('/api/findings', authenticate, findingRoutes);

  await mountGraphql(app);

  app.use(errorHandler);
  return app;
}
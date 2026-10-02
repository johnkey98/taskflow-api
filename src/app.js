import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';

import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/projects.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import { errorHandler, notFound } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests — please slow down.' },
    })
  );

  // OpenAPI docs at /docs
  const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
  if (fs.existsSync(openapiPath)) {
    const doc = yaml.parse(fs.readFileSync(openapiPath, 'utf-8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(doc, { customSiteTitle: 'TaskFlow API Docs' }));
  }

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', service: 'taskflow-api', uptime: process.uptime(), timestamp: new Date().toISOString() })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

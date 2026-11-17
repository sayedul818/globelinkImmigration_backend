import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import cookieParser from 'cookie-parser';
import { createAuthRouter } from './auth/routes.js';
import { loadConfig } from './config/env.js';
import { createCrmRouter } from './crm/routes.js';
import { createEducationRouter } from './education/routes.js';
import { createApplicationsRouter } from './applications/routes.js';
import { createVisaRouter } from './visa/routes.js';
import { createFinanceRouter } from './finance/routes.js';
import { createPortalRouter } from './portal/routes.js';
import { createCmsRouter } from './cms/routes.js';
import { createCountryGuideRouter } from './country-guides/routes.js';
import { createDestinationContentRouter } from './destination-content/routes.js';
import { createMediaRouter } from './media/routes.js';
import { createHomepageRouter } from './homepage/routes.js';

export function createApp() {
  const app = express();
  const config = loadConfig();

  app.disable('x-powered-by');
  // Behind Vercel (or another proxy) the real client IP is in X-Forwarded-For.
  if (config.TRUST_PROXY ?? Boolean(process.env['VERCEL'])) app.set('trust proxy', 1);
  app.use((request, response, next) => {
    const origin = request.headers.origin;
    const allowedOrigins = config.CORS_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.setHeader('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      response.sendStatus(origin && allowedOrigins.includes(origin) ? 204 : 403);
      return;
    }

    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/v1', (_request, response) => {
    response.json({
      name: 'Globelink Immigration API',
      version: 'v1',
    });
  });
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', createAuthRouter(config));
  app.use('/api/v1/crm', createCrmRouter(config));
  app.use('/api/v1/education', createEducationRouter(config));
  app.use('/api/v1/applications', createApplicationsRouter(config));
  app.use('/api/v1/visa', createVisaRouter(config));
  app.use('/api/v1/finance', createFinanceRouter(config));
  app.use('/api/v1/portal', createPortalRouter(config));
  app.use('/api/v1/cms', createCmsRouter(config));
  app.use('/api/v1/country-guides', createCountryGuideRouter(config));
  app.use('/api/v1/destination-content', createDestinationContentRouter(config));
  app.use('/api/v1/media', createMediaRouter(config));
  app.use('/api/v1/homepage', createHomepageRouter(config));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

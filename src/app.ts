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
import { cors, resolveAllowedOrigins } from './middleware/cors.js';

export function createApp() {
  const app = express();
  const config = loadConfig();

  app.disable('x-powered-by');
  // Behind Vercel (or another proxy) the real client IP is in X-Forwarded-For.
  if (config.TRUST_PROXY ?? Boolean(process.env['VERCEL'])) app.set('trust proxy', 1);
  app.use(cors(resolveAllowedOrigins(config.CORS_ORIGINS, config.NODE_ENV)));
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

import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { DestinationContent } from '../models/destination-content.js';

const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const maxPointsPerTopic = 50;
const maxPointLength = 500;
const contentSchema = z.object({
  heroTitle: z.string().trim().min(1).max(200),
  heroDescription: z.string().trim().min(1).max(1000),
  topics: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(2500),
    visualTitle: z.string().trim().min(1).max(200),
    points: z
      .array(z.string().trim().min(1).max(maxPointLength))
      .min(1)
      .max(maxPointsPerTopic),
  })).min(1).max(20),
});

export function createDestinationContentRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/public/:slug', async (request, response, next) => {
    try {
      const slug = slugSchema.parse(request.params['slug']);
      const content = await DestinationContent.findOne({ slug }).select('-_id -updatedBy -__v');
      response.json(content);
    } catch (error) {
      next(error);
    }
  });

  router.use(requireAuth(config));
  router.use(requirePermission('content.manage'));

  router.get('/admin', async (_request, response, next) => {
    try {
      response.json(await DestinationContent.find().select('-updatedBy -__v').sort({ slug: 1 }).lean());
    } catch (error) {
      next(error);
    }
  });

  router.put('/admin/:slug', async (request, response, next) => {
    try {
      const slug = slugSchema.parse(request.params['slug']);
      const content = contentSchema.parse(request.body);
      const saved = await DestinationContent.findOneAndUpdate(
        { slug },
        { ...content, slug, updatedBy: request.auth!.userId },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      ).select('-updatedBy -__v');
      response.json(saved);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/:slug', async (request, response, next) => {
    try {
      const slug = slugSchema.parse(request.params['slug']);
      const deleted = await DestinationContent.findOneAndDelete({ slug });
      if (!deleted) throw new AppError('Saved destination content was not found.', 404);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';

const signSchema = z.object({
  category: z.enum(['universities', 'guides', 'homepage']),
  type: z.enum(['image', 'document']),
});

export function cloudinarySignature(parameters: Record<string, string>, secret: string): string {
  const signedParameters = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join('&');
  return createHash('sha1').update(`${signedParameters}${secret}`).digest('hex');
}

export function createMediaRouter(config: AppConfig): Router {
  const router = Router();

  router.use(requireAuth(config), requirePermission('media.upload'));
  router.post('/sign', (request, response, next) => {
    try {
      if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
        throw new AppError('Cloudinary is not configured. Set its credentials in the backend environment.', 503);
      }

      const { category, type } = signSchema.parse(request.body);
      const folder = `globelink/${category}`;
      const allowedFormats = type === 'image'
        ? 'jpg,jpeg,png,webp,gif'
        : 'pdf,doc,docx,ppt,pptx,xls,xlsx';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const parameters = { allowed_formats: allowedFormats, folder, timestamp };

      response.json({
        cloudName: config.CLOUDINARY_CLOUD_NAME,
        apiKey: config.CLOUDINARY_API_KEY,
        timestamp,
        folder,
        allowedFormats,
        signature: cloudinarySignature(parameters, config.CLOUDINARY_API_SECRET),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { signAccessToken } from '../src/auth/security.js';
import { loadConfig } from '../src/config/env.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { cloudinarySignature, createMediaRouter } from '../src/media/routes.js';

describe('Cloudinary media uploads', () => {
  it('creates Cloudinary-compatible SHA-1 signatures', () => {
    expect(cloudinarySignature({
      allowed_formats: 'jpg,jpeg,png,webp,gif',
      folder: 'globelink/universities',
      timestamp: '123',
    }, 'test-secret')).toBe('0d362b84992f9fcca1a235063d68f8c0e4822932');
  });

  it('requires an authenticated media manager to request upload signatures', async () => {
    const config = loadConfig({
      ...process.env,
      JWT_ACCESS_SECRET: 'test-access-secret-for-cloudinary-media',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
    });
    const app = express();
    app.use(express.json());
    app.use('/api/v1/media', createMediaRouter(config));
    app.use(errorHandler);

    const unauthenticated = await request(app).post('/api/v1/media/sign').send({
      category: 'universities',
      type: 'image',
    });
    expect(unauthenticated.status).toBe(401);

    const token = signAccessToken({
      sub: '000000000000000000000001',
      email: 'admin@example.com',
      role: 'SUPER_ADMIN',
    }, config);
    const response = await request(app)
      .post('/api/v1/media/sign')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'universities', type: 'image' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      folder: 'globelink/universities',
      allowedFormats: 'jpg,jpeg,png,webp,gif',
    });
    expect(response.body.signature).toMatch(/^[a-f0-9]{40}$/);
  });
});

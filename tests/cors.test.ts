import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { cors, resolveAllowedOrigins } from '../src/middleware/cors.js';

function appWith(configured: string | undefined, nodeEnv = 'production') {
  const app = express();
  app.use(cors(resolveAllowedOrigins(configured, nodeEnv)));
  app.get('/ping', (_request, response) => response.json({ ok: true }));
  return app;
}

describe('CORS', () => {
  it('allows the production website and its www address by default in production', async () => {
    const app = appWith(undefined);
    for (const origin of ['https://globelinkimmigration.com', 'https://www.globelinkimmigration.com']) {
      const response = await request(app).get('/ping').set('Origin', origin);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  it('does not allow localhost or other sites in production by default', async () => {
    const app = appWith(undefined);
    for (const origin of ['http://localhost:8080', 'https://evil.example', 'http://globelinkimmigration.com']) {
      const response = await request(app).get('/ping').set('Origin', origin);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  it('allows localhost and the website by default in development', () => {
    const origins = resolveAllowedOrigins(undefined, 'development');
    expect(origins.has('http://localhost:8080')).toBe(true);
    expect(origins.has('https://globelinkimmigration.com')).toBe(true);
  });

  it('answers allowed preflight requests and rejects others', async () => {
    const app = appWith(undefined);
    const allowed = await request(app)
      .options('/ping')
      .set('Origin', 'https://globelinkimmigration.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-headers']).toContain('Authorization');
    expect(allowed.headers['access-control-max-age']).toBe('600');

    const rejected = await request(app).options('/ping').set('Origin', 'https://evil.example');
    expect(rejected.status).toBe(403);
  });

  it('tolerates trailing slashes, spaces and capital letters in CORS_ORIGINS', async () => {
    const app = appWith(' https://GlobelinkImmigration.com/ , https://admin.example.com ');
    const response = await request(app).get('/ping').set('Origin', 'https://globelinkimmigration.com');
    expect(response.headers['access-control-allow-origin']).toBe('https://globelinkimmigration.com');
  });

  it('always varies responses by Origin so caches do not mix sites', async () => {
    const response = await request(appWith(undefined)).get('/ping').set('Origin', 'https://evil.example');
    expect(response.headers['vary']).toContain('Origin');
  });
});

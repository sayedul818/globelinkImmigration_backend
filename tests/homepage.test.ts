import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/auth/security.js';
import { loadConfig } from '../src/config/env.js';
import { DEFAULT_SECTIONS, DEFAULT_SITE_SETTINGS, blankSectionBody } from '../src/homepage/defaults.js';
import { SECTION_TYPES, parseSectionBody, siteSettingsSchema } from '../src/homepage/schemas.js';

describe('homepage CMS validation', () => {
  it('accepts every seeded default section', () => {
    for (const section of DEFAULT_SECTIONS) {
      expect(() => parseSectionBody(section.type, section.body), section.key).not.toThrow();
    }
  });

  it('accepts a blank body for every section type an admin can create', () => {
    for (const type of SECTION_TYPES) {
      expect(() => parseSectionBody(type, blankSectionBody(type)), type).not.toThrow();
    }
  });

  it('accepts the default site settings', () => {
    expect(siteSettingsSchema.safeParse(DEFAULT_SITE_SETTINGS).success).toBe(true);
  });

  it('requires a hero headline', () => {
    const body = { ...blankSectionBody('hero'), title: '' };
    expect(() => parseSectionBody('hero', body)).toThrow();
  });

  it('rejects script and protocol-relative links', () => {
    for (const url of ['javascript:alert(1)', '//evil.example', 'data:text/html,hi']) {
      const body = { ...blankSectionBody('cta'), content: { primaryCta: { label: 'Go', url } } };
      expect(() => parseSectionBody('cta', body), url).toThrow();
    }
  });

  it('accepts site paths and https links', () => {
    for (const url of ['/contact', 'https://example.com/apply']) {
      const body = { ...blankSectionBody('cta'), content: { primaryCta: { label: 'Go', url } } };
      expect(() => parseSectionBody('cta', body), url).not.toThrow();
    }
  });

  it('rejects non-HTTPS image URLs', () => {
    const body = { ...blankSectionBody('hero'), content: { imageUrl: 'http://insecure.example/a.jpg' } };
    expect(() => parseSectionBody('hero', body)).toThrow();
  });

  it('rejects duplicate item ids', () => {
    const item = { id: 'same', value: '1', label: 'A' };
    const body = { ...blankSectionBody('stats'), content: { items: [item, item] } };
    expect(() => parseSectionBody('stats', body)).toThrow();
  });

  it('rejects malformed university references', () => {
    const body = { ...blankSectionBody('universities'), content: { universityIds: ['not-an-id'] } };
    expect(() => parseSectionBody('universities', body)).toThrow();
  });

  it('rejects invalid social links in site settings', () => {
    const result = siteSettingsSchema.safeParse({
      ...DEFAULT_SITE_SETTINGS,
      social: [{ platform: 'instagram', url: 'javascript:alert(1)' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('homepage CMS access control', () => {
  const config = loadConfig();
  const token = (role: string) =>
    signAccessToken({ sub: '507f1f77bcf86cd799439011', email: `${role.toLowerCase()}@example.com`, role }, config);

  it('requires authentication for admin endpoints', async () => {
    const app = createApp();
    for (const [method, path] of [
      ['get', '/api/v1/homepage/admin/sections'],
      ['get', '/api/v1/homepage/admin/preview'],
      ['put', '/api/v1/homepage/admin/settings'],
      ['put', '/api/v1/homepage/admin/order'],
      ['delete', '/api/v1/homepage/admin/sections/hero'],
    ] as const) {
      const response = await request(app)[method](path);
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });

  it('rejects roles without content management permission', async () => {
    const app = createApp();
    for (const role of ['CUSTOMER', 'EDUCATION_COUNSELLOR', 'VISA_OFFICER', 'CEO']) {
      const response = await request(app)
        .get('/api/v1/homepage/admin/preview')
        .set('Authorization', `Bearer ${token(role)}`);
      expect(response.status, role).toBe(403);
    }
  });
});

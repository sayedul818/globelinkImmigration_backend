import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

describe('configuration parsing', () => {
  it('reads COOKIE_SECURE=false as false (not truthy text)', () => {
    expect(loadConfig({ ...process.env, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
    expect(loadConfig({ ...process.env, COOKIE_SECURE: '0' }).COOKIE_SECURE).toBe(false);
  });

  it('reads COOKIE_SECURE=true as true', () => {
    expect(loadConfig({ ...process.env, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(true);
  });

  it('defaults COOKIE_SECURE to false when unset', () => {
    const env = { ...process.env };
    delete env['COOKIE_SECURE'];
    expect(loadConfig(env).COOKIE_SECURE).toBe(false);
  });

  it('rejects unrecognised COOKIE_SECURE values instead of guessing', () => {
    expect(() => loadConfig({ ...process.env, COOKIE_SECURE: 'yes please' })).toThrow();
  });
});

describe('sign-in protection', () => {
  it('rate-limits repeated sign-in attempts from one address', async () => {
    const app = createApp();
    const statuses: number[] = [];
    // Invalid payloads fail validation before any database lookup.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
    expect(statuses.slice(10).every((status) => status === 429)).toBe(true);
  });
});

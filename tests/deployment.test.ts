import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

const production = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.mongodb.net/globelink_db',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  COOKIE_SECURE: 'true',
  COOKIE_SAME_SITE: 'none',
};

describe('deployment configuration', () => {
  it('accepts a complete production configuration', () => {
    const config = loadConfig(production);
    expect(config.COOKIE_SAME_SITE).toBe('none');
    expect(config.COOKIE_SECURE).toBe(true);
  });

  it('refuses cross-site cookies without HTTPS-only cookies', () => {
    expect(() => loadConfig({ ...production, COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE=true/);
  });

  it('refuses the placeholder JWT secrets in production', () => {
    const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ...rest } = production;
    void JWT_ACCESS_SECRET, void JWT_REFRESH_SECRET;
    expect(() => loadConfig(rest)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('refuses a local database in production', () => {
    expect(() => loadConfig({ ...production, MONGODB_URI: 'mongodb://127.0.0.1:27017/globelink' })).toThrow(/MONGODB_URI/);
  });

  it('keeps local development working with defaults', () => {
    expect(() => loadConfig({ NODE_ENV: 'development' })).not.toThrow();
  });
});

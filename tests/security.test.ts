import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { hashPassword, signAccessToken, verifyAccessToken, verifyPassword } from '../src/auth/security.js';

const config = loadConfig({
  NODE_ENV: 'test',
  PORT: '4000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/globelink-test',
  JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough',
  JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough',
});

describe('authentication security', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).not.toContain('correct horse');
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
    expect(await verifyPassword(hash, 'wrong password')).toBe(false);
  });

  it('signs and verifies access claims', () => {
    const token = signAccessToken({ sub: 'user-id', email: 'user@example.com', role: 'CUSTOMER' }, config);

    expect(verifyAccessToken(token, config)).toMatchObject({
      sub: 'user-id',
      email: 'user@example.com',
      role: 'CUSTOMER',
      type: 'access',
    });
  });
});

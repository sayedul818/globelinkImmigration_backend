import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import type { AppConfig } from '../config/env.js';

export type AuthClaims = { sub: string; email: string; role: string; type: 'access' | 'refresh' };
type JwtExpiry = NonNullable<SignOptions['expiresIn']>;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function signAccessToken(claims: Omit<AuthClaims, 'type'>, config: AppConfig): string {
  return jwt.sign({ ...claims, type: 'access' }, config.JWT_ACCESS_SECRET, { expiresIn: config.JWT_ACCESS_EXPIRES_IN as JwtExpiry });
}

export function signRefreshToken(claims: Omit<AuthClaims, 'type'>, config: AppConfig): string {
  return jwt.sign({ ...claims, type: 'refresh' }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN as JwtExpiry });
}

export function verifyAccessToken(token: string, config: AppConfig): AuthClaims {
  const claims = jwt.verify(token, config.JWT_ACCESS_SECRET) as AuthClaims;
  if (claims.type !== 'access') throw new Error('Invalid access token');
  return claims;
}

export function verifyRefreshToken(token: string, config: AppConfig): AuthClaims {
  const claims = jwt.verify(token, config.JWT_REFRESH_SECRET) as AuthClaims;
  if (claims.type !== 'refresh') throw new Error('Invalid refresh token');
  return claims;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(config: AppConfig): Date {
  const match = config.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const amount = Number(match[1]);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + amount * multipliers[match[2] as keyof typeof multipliers]);
}

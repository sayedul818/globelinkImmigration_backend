import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { AppError } from '../middleware/error-handler.js';
import { User } from '../models/user.js';
import { RefreshToken } from '../models/refresh-token.js';
import { hashPassword, hashToken, refreshTokenExpiry, signAccessToken, signRefreshToken, verifyPassword, verifyRefreshToken } from './security.js';
import { requireAuth, requirePermission } from './middleware.js';
import { rateLimit } from '../lib/rate-limit.js';

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const employeeSchema = credentialsSchema.extend({ firstName: z.string().min(1), lastName: z.string().min(1), role: z.string().min(1) });
const refreshCookie = 'globelink_refresh_token';

async function tokens(user: { _id: { toString(): string }; email: string; role: string }, config: AppConfig) {
  const claims = { sub: user._id.toString(), email: user.email, role: user.role };
  const refreshToken = signRefreshToken(claims, config);
  await RefreshToken.create({ tokenHash: hashToken(refreshToken), userId: user._id, expiresAt: refreshTokenExpiry(config) });
  return { accessToken: signAccessToken(claims, config), refreshToken };
}

export function createAuthRouter(config: AppConfig): Router {
  const router = Router();
  const cookieOptions = {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    path: '/api/v1/auth',
  } as const;

  // Slows down password guessing: 10 attempts per IP every 15 minutes.
  const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, message: 'Too many sign-in attempts. Please wait a few minutes and try again.' });

  router.post('/login', loginLimiter, async (request, response, next) => {
    try {
      const input = credentialsSchema.parse(request.body);
      const user = await User.findOne({ email: input.email }).select('+passwordHash');
      if (!user || !user.isActive || !(await verifyPassword(user.passwordHash, input.password))) throw new AppError('Invalid email or password.', 401);
      const result = await tokens(user, config);
      response.cookie(refreshCookie, result.refreshToken, cookieOptions);
      response.json({ accessToken: result.accessToken, user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } });
    } catch (error) { next(error); }
  });

  router.post('/refresh', async (request, response, next) => {
    try {
      const refreshToken = request.cookies[refreshCookie];
      if (!refreshToken) throw new AppError('Refresh authentication is required.', 401);
      const claims = verifyRefreshToken(refreshToken, config);
      const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken), revokedAt: { $exists: false } });
      if (!stored || stored.expiresAt <= new Date()) throw new AppError('The refresh token is invalid or expired.', 401);
      stored.revokedAt = new Date();
      await stored.save();
      const user = await User.findById(claims.sub);
      if (!user || !user.isActive) throw new AppError('User account was not found or is inactive.', 401);
      const result = await tokens(user, config);
      response.cookie(refreshCookie, result.refreshToken, cookieOptions);
      response.json({ accessToken: result.accessToken });
    } catch (error) { next(error instanceof AppError ? error : new AppError('The refresh token is invalid or expired.', 401)); }
  });

  router.post('/logout', async (request, response, next) => {
    try {
      const refreshToken = request.cookies[refreshCookie];
      if (refreshToken) await RefreshToken.updateOne({ tokenHash: hashToken(refreshToken) }, { $set: { revokedAt: new Date() } });
      response.clearCookie(refreshCookie, cookieOptions);
      response.status(204).send();
    } catch (error) { next(error); }
  });

  router.get('/me', requireAuth(config), async (request, response, next) => {
    try {
      const user = await User.findById(request.auth?.userId);
      if (!user || !user.isActive) throw new AppError('User account was not found or is inactive.', 401);
      response.json({ id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role });
    } catch (error) { next(error); }
  });

  router.get('/employees', requireAuth(config), requirePermission('employee.read'), async (_request, response, next) => {
    try { response.json(await User.find().select('-passwordHash').sort({ createdAt: -1 })); } catch (error) { next(error); }
  });

  router.post('/employees', requireAuth(config), requirePermission('employee.create'), async (request, response, next) => {
    try {
      const input = employeeSchema.parse(request.body);
      const user = await User.create({ ...input, email: input.email.toLowerCase(), passwordHash: await hashPassword(input.password) });
      response.status(201).json({ id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive });
    } catch (error) { next(error); }
  });

  router.patch('/employees/:id', requireAuth(config), requirePermission('employee.update'), async (request, response, next) => {
    try {
      const input = employeeSchema.partial().omit({ password: true }).parse(request.body);
      const user = await User.findByIdAndUpdate(request.params['id'], input, { new: true, runValidators: true }).select('-passwordHash');
      if (!user) throw new AppError('Employee was not found.', 404);
      response.json(user);
    } catch (error) { next(error); }
  });

  router.post('/employees/:id/deactivate', requireAuth(config), requirePermission('employee.deactivate'), async (request, response, next) => {
    try {
      const user = await User.findByIdAndUpdate(request.params['id'], { isActive: false }, { new: true }).select('-passwordHash');
      if (!user) throw new AppError('Employee was not found.', 404);
      await RefreshToken.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
      response.json(user);
    } catch (error) { next(error); }
  });

  return router;
}

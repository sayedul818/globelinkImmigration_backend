import type { RequestHandler } from 'express';
import { AppError } from '../middleware/error-handler.js';

/**
 * Simple fixed-window rate limiter keyed by client IP, for public endpoints.
 * In-memory: suitable for a single API instance. Use a shared store (e.g. Redis)
 * if the API is ever scaled horizontally.
 */
export function rateLimit({ windowMs, max, message }: { windowMs: number; max: number; message: string }): RequestHandler & {
  reset: () => void;
} {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const handler: RequestHandler = (request, _response, next) => {
    const now = Date.now();
    const key = request.ip ?? 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Opportunistic cleanup so the map cannot grow without bound.
      if (hits.size > 5000) for (const [ip, value] of hits) if (value.resetAt <= now) hits.delete(ip);
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return next(new AppError(message, 429));
    next();
  };

  return Object.assign(handler, { reset: () => hits.clear() });
}

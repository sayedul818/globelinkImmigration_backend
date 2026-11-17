import type { RequestHandler } from 'express';

/** Production website origins, used when CORS_ORIGINS is not set. */
export const PRODUCTION_ORIGINS = ['https://globelinkimmigration.com', 'https://www.globelinkimmigration.com'];
/** Local development servers, used when CORS_ORIGINS is not set outside production. */
export const DEVELOPMENT_ORIGINS = ['http://localhost:3000', 'http://localhost:8080'];

/** Lower-cases and strips trailing slashes so "https://Site.com/" matches the browser's "https://site.com". */
export function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

/** Parses a comma-separated origin list, falling back to sensible defaults per environment. */
export function resolveAllowedOrigins(configured: string | undefined, nodeEnv: string): Set<string> {
  const list = configured?.trim()
    ? configured.split(',')
    : nodeEnv === 'production'
      ? PRODUCTION_ORIGINS
      : [...DEVELOPMENT_ORIGINS, ...PRODUCTION_ORIGINS];
  return new Set(list.map(normalizeOrigin).filter(Boolean));
}

/**
 * CORS for the website. Only listed origins may call the API from a browser, and
 * credentials are allowed so the httpOnly refresh-token cookie works.
 */
export function cors(allowedOrigins: Set<string>): RequestHandler {
  return (request, response, next) => {
    const origin = request.headers.origin;
    const allowed = Boolean(origin && allowedOrigins.has(normalizeOrigin(origin)));

    // Responses differ by Origin, so caches must key on it even for rejected origins.
    response.vary('Origin');

    if (allowed && origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      // Let browsers reuse a successful preflight for 10 minutes.
      response.setHeader('Access-Control-Max-Age', '600');
    }

    if (request.method === 'OPTIONS') {
      response.sendStatus(allowed ? 204 : 403);
      return;
    }
    next();
  };
}

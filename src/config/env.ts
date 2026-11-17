import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/globelink'),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-12345'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-12345'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  // Parse the text explicitly: z.coerce.boolean() would turn the string "false" into true.
  COOKIE_SECURE: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((value) => value === 'true' || value === '1'),
  /**
   * SameSite policy for the refresh-token cookie. Use "none" when the website and
   * API are on different sites (e.g. *.lovable.app and *.vercel.app); this also
   * requires COOKIE_SECURE=true (HTTPS).
   */
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  /** Trust X-Forwarded-For from a hosting proxy (Vercel, Render, Nginx) so rate limits see real client IPs. */
  TRUST_PROXY: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true' || value === '1')),
  /**
   * Comma-separated website origins allowed to call the API. When unset, production
   * allows https://globelinkimmigration.com (and www); development also allows localhost.
   */
  CORS_ORIGINS: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }
  const config = result.data;
  // Browsers reject SameSite=None cookies that are not Secure, which would silently break sign-in.
  if (config.COOKIE_SAME_SITE === 'none' && !config.COOKIE_SECURE) {
    throw new Error('Invalid environment configuration: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true.');
  }
  if (config.NODE_ENV === 'production' && /change-me|change-this/i.test(config.JWT_ACCESS_SECRET + config.JWT_REFRESH_SECRET)) {
    throw new Error('Invalid environment configuration: set real JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values in production.');
  }
  if (config.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(config.MONGODB_URI)) {
    throw new Error('Invalid environment configuration: set MONGODB_URI to your hosted database (e.g. MongoDB Atlas) in production.');
  }
  return config;
}

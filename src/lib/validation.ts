import { z } from 'zod';

/** MongoDB ObjectId as a 24-character hex string. */
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');

/** A site-relative path ("/contact") or an absolute HTTP(S) URL. Rejects javascript:, protocol-relative and backslash tricks. */
export const safeLink = z.string().trim().max(2000).refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Use a site path such as /contact or an http(s) URL.');

/** Optional link that also accepts an empty string (cleared field in the admin UI). */
export const optionalLink = z.union([safeLink, z.literal('')]).optional();

/** Optional HTTPS media URL (or site-relative path); empty string allowed. */
export const optionalMediaUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value === '' || /^https:\/\//i.test(value) || (value.startsWith('/') && !value.startsWith('//')), 'Use an HTTPS URL.')
  .optional();

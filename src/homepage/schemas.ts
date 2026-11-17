import { z } from 'zod';
import { objectId, optionalLink, optionalMediaUrl, safeLink } from '../lib/validation.js';

/* ------------------------------------------------------------------ */
/* Section types                                                       */
/* ------------------------------------------------------------------ */

export const SECTION_TYPES = [
  'hero',
  'stats',
  'destinations',
  'features',
  'services',
  'journey',
  'universities',
  'intakes',
  'scholarships',
  'testimonials',
  'blog',
  'cta',
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

/** Types that may exist only once on the homepage. */
export const SINGLETON_TYPES: readonly SectionType[] = ['hero'];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

const itemBase = {
  id: z.string().trim().min(1).max(64),
  enabled: z.boolean().default(true),
};

/** A label + link pair. Both optional so an admin can hide a button by clearing it. */
const cta = z.object({ label: optionalText(60), url: optionalLink }).default({});

const icon = z.string().trim().max(40).regex(/^[A-Za-z0-9]*$/, 'Use an icon name from the list.').optional();

const items = <T extends z.ZodRawShape>(shape: T, max: number) =>
  z
    .array(z.object({ ...itemBase, ...shape }))
    .max(max)
    .default([])
    .refine(
      (list) => new Set(list.map((item) => (item as { id: string }).id)).size === list.length,
      'Item ids must be unique.',
    );

/* ------------------------------------------------------------------ */
/* Per-type content                                                    */
/* ------------------------------------------------------------------ */

export const contentSchemas = {
  hero: z.object({
    /** Part of the title to emphasise visually. Must appear in the title to have an effect. */
    highlight: optionalText(80),
    primaryCta: cta,
    secondaryCta: cta,
    imageUrl: optionalMediaUrl,
    imageAlt: optionalText(200),
    videoUrl: optionalMediaUrl,
    chips: z.array(requiredText(30)).max(10).default([]),
    floatingCards: items({ value: requiredText(20), label: requiredText(40) }, 3),
  }),
  stats: z.object({
    items: items({ value: requiredText(20), label: requiredText(60), description: optionalText(120) }, 8),
  }),
  destinations: z.object({
    items: items(
      {
        name: requiredText(80),
        countryCode: z
          .string()
          .trim()
          .regex(/^([A-Z]{2})?$/, 'Use a two-letter country code such as CA.')
          .optional(),
        url: optionalLink,
        imageUrl: optionalMediaUrl,
        imageAlt: optionalText(200),
        description: optionalText(300),
        intake: optionalText(80),
        ctaLabel: optionalText(40),
        featured: z.boolean().default(false),
      },
      24,
    ),
    allCta: cta,
  }),
  features: z.object({
    items: items({ icon, title: requiredText(80), text: optionalText(300) }, 8),
    imageUrl: optionalMediaUrl,
    imageAlt: optionalText(200),
  }),
  services: z.object({
    items: items(
      {
        icon,
        title: requiredText(80),
        text: optionalText(300),
        url: optionalLink,
        ctaLabel: optionalText(40),
        imageUrl: optionalMediaUrl,
        imageAlt: optionalText(200),
      },
      8,
    ),
  }),
  journey: z.object({
    items: items({ icon, title: requiredText(60), text: optionalText(240) }, 12),
  }),
  universities: z.object({
    universityIds: z.array(objectId).max(12).default([]),
    cta,
  }),
  intakes: z.object({
    items: items(
      {
        name: requiredText(40),
        season: optionalText(40),
        description: optionalText(300),
        note: optionalText(120),
      },
      6,
    ),
    cta,
  }),
  scholarships: z.object({
    scholarshipIds: z.array(objectId).max(12).default([]),
    cta,
  }),
  testimonials: z.object({
    items: items(
      {
        name: requiredText(80),
        photoUrl: optionalMediaUrl,
        destination: optionalText(80),
        university: optionalText(120),
        program: optionalText(120),
        quote: requiredText(800),
        videoUrl: z.union([safeLink, z.literal('')]).optional(),
        featured: z.boolean().default(false),
      },
      24,
    ),
  }),
  blog: z.object({
    mode: z.enum(['latest', 'selected']).default('latest'),
    limit: z.number().int().min(1).max(6).default(3),
    postIds: z.array(objectId).max(6).default([]),
    cta,
  }),
  cta: z.object({
    primaryCta: cta,
    secondaryCta: cta,
    imageUrl: optionalMediaUrl,
    imageAlt: optionalText(200),
  }),
} satisfies Record<SectionType, z.ZodType>;

export type SectionContent<T extends SectionType> = z.infer<(typeof contentSchemas)[T]>;

/** Text shared by every section type. */
export const sectionTextSchema = z.object({
  eyebrow: text(60).default(''),
  title: text(160).default(''),
  subtitle: text(500).default(''),
});

/** Validates a full section draft (shared text + type-specific content). */
export function parseSectionBody(type: SectionType, body: unknown) {
  const base = sectionTextSchema.extend({ content: contentSchemas[type] });
  const schema = type === 'hero' ? base.extend({ title: requiredText(160) }) : base;
  return schema.parse(body);
}

/* ------------------------------------------------------------------ */
/* Admin request bodies                                                */
/* ------------------------------------------------------------------ */

export const createSectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  label: optionalText(80),
});

export const updateSectionMetaSchema = z
  .object({ enabled: z.boolean().optional(), label: optionalText(80) })
  .refine((value) => value.enabled !== undefined || value.label !== undefined, 'Nothing to update.');

export const orderSchema = z.object({
  keys: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
});

/* ------------------------------------------------------------------ */
/* Global site settings                                                */
/* ------------------------------------------------------------------ */

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'youtube', 'x', 'tiktok', 'whatsapp'] as const;

export const siteSettingsSchema = z.object({
  companyName: requiredText(120),
  tagline: optionalText(160),
  logoUrl: optionalMediaUrl,
  logoLightUrl: optionalMediaUrl,
  contact: z
    .object({
      email: z.union([z.string().trim().email().max(200), z.literal('')]).optional(),
      phone: optionalText(40),
      whatsapp: optionalText(40),
      address: optionalText(300),
      officeHours: optionalText(120),
    })
    .default({}),
  social: z
    .array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: safeLink }))
    .max(10)
    .default([]),
  ctaDefaults: z
    .object({ primary: cta, secondary: cta })
    .default({ primary: {}, secondary: {} }),
  seo: z
    .object({
      title: text(70).default(''),
      description: text(160).default(''),
      ogImageUrl: optionalMediaUrl,
    })
    .default({ title: '', description: '' }),
  footer: z
    .object({ about: optionalText(400), copyright: optionalText(160) })
    .default({}),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

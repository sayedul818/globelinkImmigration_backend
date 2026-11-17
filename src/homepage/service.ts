import type { z } from 'zod';
import { HomepageSection, SiteSettingsModel } from '../models/homepage.js';
import { University, Scholarship } from '../models/education.js';
import { BlogPost } from '../models/cms.js';
import { slugify } from '../lib/slug.js';
import { DEFAULT_SECTIONS, DEFAULT_SITE_SETTINGS } from './defaults.js';
import { contentSchemas, siteSettingsSchema, type SectionType, type SiteSettings } from './schemas.js';

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

let seeded = false;

/**
 * Inserts the default sections and settings if they do not exist yet.
 * Insert-only ($setOnInsert): it never overwrites anything an admin edited,
 * and concurrent calls are safe because writes are keyed upserts.
 */
export async function ensureHomepageSeeded(): Promise<void> {
  if (seeded) return;
  const existing = await HomepageSection.estimatedDocumentCount();
  if (existing === 0) {
    const now = new Date();
    await HomepageSection.bulkWrite(
      DEFAULT_SECTIONS.map((section, index) => ({
        updateOne: {
          filter: { key: section.key },
          update: {
            $setOnInsert: {
              key: section.key,
              type: section.type,
              label: section.label,
              enabled: section.enabled,
              displayOrder: index,
              draft: section.body,
              published: section.body,
              publishedAt: now,
              draftUpdatedAt: now,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  await SiteSettingsModel.updateOne(
    { key: 'site' },
    { $setOnInsert: { key: 'site', ...DEFAULT_SITE_SETTINGS } },
    { upsert: true },
  );
  seeded = true;
}

/** Test hook: forget that seeding already ran in this process. */
export function resetSeedFlagForTests() {
  seeded = false;
}

/* ------------------------------------------------------------------ */
/* Site settings                                                       */
/* ------------------------------------------------------------------ */

export async function getSiteSettings(): Promise<SiteSettings> {
  await ensureHomepageSeeded();
  const doc = await SiteSettingsModel.findOne({ key: 'site' }).lean();
  const parsed = siteSettingsSchema.safeParse(stripMeta(doc));
  return parsed.success ? parsed.data : DEFAULT_SITE_SETTINGS;
}

function stripMeta(doc: unknown): unknown {
  if (!doc || typeof doc !== 'object') return doc;
  const { _id, __v, key, createdAt, updatedAt, updatedBy, ...rest } = doc as Record<string, unknown>;
  void _id, void __v, void key, void createdAt, void updatedAt, void updatedBy;
  return rest;
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export interface ComposedSection {
  key: string;
  type: SectionType;
  eyebrow: string;
  title: string;
  subtitle: string;
  data: unknown;
}

type ListItem = { enabled?: boolean } & Record<string, unknown>;

const enabledOnly = <T extends ListItem>(list: T[]) =>
  list.filter((item) => item.enabled !== false).map(({ enabled, ...rest }) => {
    void enabled;
    return rest;
  });

const truncate = (value: string | null | undefined, max: number) => {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

/** Returns documents in the order of `ids`, skipping ones that were not found. */
function inOrder<T extends { _id: { toString(): string } }>(ids: string[], docs: T[]): T[] {
  const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]));
  return ids.map((id) => byId.get(id)).filter((doc): doc is T => Boolean(doc));
}

type PopulatedCountry = { name?: string; code?: string } | null | undefined;

async function resolveUniversities(ids: string[]) {
  if (ids.length === 0) return [];
  const docs = await University.find({ _id: { $in: ids }, isActive: true, publicationStatus: 'PUBLISHED' })
    .select('name countryId description logoUrl location media')
    .populate('countryId', 'name code')
    .lean();
  return inOrder(ids, docs).map((doc) => {
    const country = doc.countryId as unknown as PopulatedCountry;
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: slugify(doc.name),
      country: country?.name ?? '',
      countryCode: country?.code ?? '',
      city: doc.location?.city ?? '',
      description: truncate(doc.description, 200),
      logoUrl: doc.logoUrl ?? '',
      imageUrl: doc.media?.campusImageUrl ?? '',
    };
  });
}

async function resolveScholarships(ids: string[]) {
  if (ids.length === 0) return [];
  const now = new Date();
  const docs = await Scholarship.find({
    _id: { $in: ids },
    isActive: true,
    $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: now } }],
  })
    .populate('countryId', 'name code')
    .populate('universityId', 'name')
    .lean();
  return inOrder(ids, docs).map((doc) => {
    const country = doc.countryId as unknown as PopulatedCountry;
    const university = doc.universityId as unknown as { name?: string } | null;
    const amount =
      typeof doc.amount === 'number' && doc.amount > 0
        ? new Intl.NumberFormat('en', { style: 'currency', currency: doc.currency || 'USD', maximumFractionDigits: 0 }).format(doc.amount)
        : '';
    const coverage =
      doc.fundingType === 'FULL' ? 'Full funding' : doc.fundingType === 'PARTIAL' ? `Partial funding${amount ? ` · up to ${amount}` : ''}` : amount || 'Fixed award';
    return {
      id: doc._id.toString(),
      name: doc.name,
      institution: university?.name ?? doc.provider,
      country: country?.name ?? '',
      countryCode: country?.code ?? '',
      level: doc.level,
      coverage,
      deadline: doc.deadline ? doc.deadline.toISOString() : null,
      eligibility: truncate(doc.eligibility, 180),
    };
  });
}

async function resolveBlog(content: { mode: 'latest' | 'selected'; limit: number; postIds: string[] }) {
  const base = { status: 'PUBLISHED' };
  const query =
    content.mode === 'selected' && content.postIds.length > 0
      ? BlogPost.find({ ...base, _id: { $in: content.postIds } })
      : BlogPost.find(base).sort({ publishedAt: -1 }).limit(content.limit);
  const docs = await query
    .select('slug title excerpt coverImageUrl category tags publishedAt authorId')
    .populate('authorId', 'firstName lastName')
    .lean();
  const ordered = content.mode === 'selected' && content.postIds.length > 0 ? inOrder(content.postIds, docs) : docs;
  return ordered.slice(0, content.limit).map((doc) => {
    const author = doc.authorId as unknown as { firstName?: string; lastName?: string } | null;
    return {
      id: doc._id.toString(),
      slug: doc.slug,
      title: doc.title,
      excerpt: truncate(doc.excerpt, 200),
      imageUrl: doc.coverImageUrl ?? '',
      category: doc.category || doc.tags?.[0] || '',
      author: author ? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() : '',
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    };
  });
}

/** Turns stored content into the public shape for one section; returns null to hide it. */
async function resolveSection(type: SectionType, raw: unknown): Promise<unknown | null> {
  const parsed = contentSchemas[type].safeParse(raw);
  if (!parsed.success) return null;

  switch (type) {
    case 'hero': {
      const content = parsed.data as z.infer<typeof contentSchemas.hero>;
      return { ...content, floatingCards: enabledOnly(content.floatingCards) };
    }
    case 'universities': {
      const content = parsed.data as z.infer<typeof contentSchemas.universities>;
      const universities = await resolveUniversities(content.universityIds);
      return universities.length ? { items: universities, cta: content.cta } : null;
    }
    case 'scholarships': {
      const content = parsed.data as z.infer<typeof contentSchemas.scholarships>;
      const scholarships = await resolveScholarships(content.scholarshipIds);
      return scholarships.length ? { items: scholarships, cta: content.cta } : null;
    }
    case 'blog': {
      const content = parsed.data as z.infer<typeof contentSchemas.blog>;
      const posts = await resolveBlog(content);
      return posts.length ? { items: posts, cta: content.cta } : null;
    }
    case 'cta':
      return parsed.data;
    default: {
      // Every remaining type is an item list.
      const content = parsed.data as { items: ListItem[] } & Record<string, unknown>;
      const items = enabledOnly(content.items);
      return items.length ? { ...content, items } : null;
    }
  }
}

/**
 * Builds the homepage payload. "published" is what visitors see; "draft" is the
 * authenticated preview of unpublished edits. Disabled and empty sections are
 * omitted, so the frontend only renders what has content.
 */
export async function composeHomepage(mode: 'published' | 'draft') {
  await ensureHomepageSeeded();
  const [sections, settings] = await Promise.all([
    HomepageSection.find().sort({ displayOrder: 1, createdAt: 1 }).lean(),
    getSiteSettings(),
  ]);

  const composed = await Promise.all(
    sections.map(async (section): Promise<ComposedSection | null> => {
      if (!section.enabled) return null;
      const body = mode === 'draft' ? section.draft : section.published;
      if (!body) return null;
      const type = section.type as SectionType;
      const data = await resolveSection(type, body.content);
      if (data === null) return null;
      if (type === 'hero' && !body.title) return null;
      return {
        key: section.key,
        type,
        eyebrow: body.eyebrow ?? '',
        title: body.title ?? '',
        subtitle: body.subtitle ?? '',
        data,
      };
    }),
  );

  return {
    settings,
    sections: composed.filter((section): section is ComposedSection => section !== null),
    generatedAt: new Date().toISOString(),
  };
}

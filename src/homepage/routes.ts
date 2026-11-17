import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { HomepageSection, SiteSettingsModel } from '../models/homepage.js';
import { blankSectionBody } from './defaults.js';
import {
  SINGLETON_TYPES,
  createSectionSchema,
  orderSchema,
  parseSectionBody,
  siteSettingsSchema,
  updateSectionMetaSchema,
  type SectionType,
} from './schemas.js';
import { composeHomepage, ensureHomepageSeeded, getSiteSettings } from './service.js';

const sectionKey = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-z0-9-]{1,80}$/.test(value)) throw new AppError('Section was not found.', 404);
  return value;
};

type SectionDoc = {
  key: string;
  type: string;
  label: string;
  enabled: boolean;
  displayOrder: number;
  draft: unknown;
  published: unknown;
  publishedAt?: Date | null;
  draftUpdatedAt?: Date | null;
  updatedAt?: Date;
};

/** Admin view of a section, including whether the draft differs from the live copy. */
function adminView(section: SectionDoc) {
  return {
    key: section.key,
    type: section.type,
    label: section.label,
    enabled: section.enabled,
    displayOrder: section.displayOrder,
    draft: section.draft,
    published: section.published,
    publishedAt: section.publishedAt ?? null,
    draftUpdatedAt: section.draftUpdatedAt ?? null,
    status: !section.published
      ? 'DRAFT'
      : JSON.stringify(section.draft) === JSON.stringify(section.published)
        ? 'PUBLISHED'
        : 'CHANGED',
  };
}

export function createHomepageRouter(config: AppConfig): Router {
  const router = Router();

  /* -------------------------- Public -------------------------- */

  router.get('/', async (_request, response, next) => {
    try {
      response.setHeader('Cache-Control', 'no-cache');
      response.json(await composeHomepage('published'));
    } catch (error) {
      next(error);
    }
  });

  router.get('/settings', async (_request, response, next) => {
    try {
      response.setHeader('Cache-Control', 'no-cache');
      response.json(await getSiteSettings());
    } catch (error) {
      next(error);
    }
  });

  /* -------------------------- Admin -------------------------- */

  router.use('/admin', requireAuth(config), requirePermission('content.manage'));

  router.get('/admin/sections', async (_request, response, next) => {
    try {
      await ensureHomepageSeeded();
      const sections = await HomepageSection.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
      response.json(sections.map((section) => adminView(section as unknown as SectionDoc)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/sections', async (request, response, next) => {
    try {
      const input = createSectionSchema.parse(request.body);
      if (SINGLETON_TYPES.includes(input.type) && (await HomepageSection.exists({ type: input.type }))) {
        throw new AppError('The homepage can only have one section of this type.', 409);
      }
      const last = await HomepageSection.findOne().sort({ displayOrder: -1 }).select('displayOrder').lean();
      const key = `${input.type}-${randomBytes(3).toString('hex')}`;
      const created = await HomepageSection.create({
        key,
        type: input.type,
        label: input.label || defaultLabel(input.type),
        // New sections stay hidden until the admin has added content and published it.
        enabled: false,
        displayOrder: (last?.displayOrder ?? -1) + 1,
        draft: blankSectionBody(input.type),
        published: null,
        draftUpdatedAt: new Date(),
        updatedBy: request.auth!.userId,
      });
      response.status(201).json(adminView(created.toObject() as unknown as SectionDoc));
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/sections/:key', async (request, response, next) => {
    try {
      const section = await HomepageSection.findOne({ key: sectionKey(request.params['key']) }).lean();
      if (!section) throw new AppError('Section was not found.', 404);
      response.json(adminView(section as unknown as SectionDoc));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/sections/:key', async (request, response, next) => {
    try {
      const input = updateSectionMetaSchema.parse(request.body);
      const update: Record<string, unknown> = { updatedBy: request.auth!.userId };
      if (input.enabled !== undefined) update['enabled'] = input.enabled;
      if (input.label) update['label'] = input.label;
      const section = await HomepageSection.findOneAndUpdate({ key: sectionKey(request.params['key']) }, update, {
        new: true,
      }).lean();
      if (!section) throw new AppError('Section was not found.', 404);
      response.json(adminView(section as unknown as SectionDoc));
    } catch (error) {
      next(error);
    }
  });

  /** Saves the working copy. Visitors keep seeing the published copy until publish. */
  router.put('/admin/sections/:key/draft', async (request, response, next) => {
    try {
      const key = sectionKey(request.params['key']);
      const existing = await HomepageSection.findOne({ key }).select('type').lean();
      if (!existing) throw new AppError('Section was not found.', 404);
      const draft = parseSectionBody(existing.type as SectionType, request.body);
      const section = await HomepageSection.findOneAndUpdate(
        { key },
        { draft, draftUpdatedAt: new Date(), updatedBy: request.auth!.userId },
        { new: true },
      ).lean();
      response.json(adminView(section as unknown as SectionDoc));
    } catch (error) {
      next(error);
    }
  });

  /** Makes the current draft live. The draft is re-validated so stale data can never be published. */
  router.post('/admin/sections/:key/publish', async (request, response, next) => {
    try {
      const key = sectionKey(request.params['key']);
      const existing = await HomepageSection.findOne({ key }).lean();
      if (!existing) throw new AppError('Section was not found.', 404);
      const body = parseSectionBody(existing.type as SectionType, existing.draft);
      const section = await HomepageSection.findOneAndUpdate(
        { key },
        { draft: body, published: body, publishedAt: new Date(), updatedBy: request.auth!.userId },
        { new: true },
      ).lean();
      response.json(adminView(section as unknown as SectionDoc));
    } catch (error) {
      next(error);
    }
  });

  /** Throws away unpublished edits by copying the live content back into the draft. */
  router.post('/admin/sections/:key/discard', async (request, response, next) => {
    try {
      const key = sectionKey(request.params['key']);
      const existing = await HomepageSection.findOne({ key }).lean();
      if (!existing) throw new AppError('Section was not found.', 404);
      if (!existing.published) throw new AppError('This section has never been published, so there is nothing to revert to.', 400);
      const section = await HomepageSection.findOneAndUpdate(
        { key },
        { draft: existing.published, draftUpdatedAt: new Date(), updatedBy: request.auth!.userId },
        { new: true },
      ).lean();
      response.json(adminView(section as unknown as SectionDoc));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/sections/:key', async (request, response, next) => {
    try {
      const key = sectionKey(request.params['key']);
      const existing = await HomepageSection.findOne({ key }).select('type').lean();
      if (!existing) throw new AppError('Section was not found.', 404);
      if (existing.type === 'hero') throw new AppError('The hero section cannot be deleted. Hide it instead.', 409);
      await HomepageSection.deleteOne({ key });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  /** Sets the display order from a complete, ordered list of section keys. */
  router.put('/admin/order', async (request, response, next) => {
    try {
      const { keys } = orderSchema.parse(request.body);
      const existing = await HomepageSection.find().select('key').lean();
      const known = new Set(existing.map((section) => section.key));
      if (keys.length !== known.size || new Set(keys).size !== keys.length || keys.some((key) => !known.has(key))) {
        throw new AppError('The order must list every section exactly once.', 400);
      }
      await HomepageSection.bulkWrite(
        keys.map((key, index) => ({ updateOne: { filter: { key }, update: { displayOrder: index } } })),
      );
      const sections = await HomepageSection.find().sort({ displayOrder: 1 }).lean();
      response.json(sections.map((section) => adminView(section as unknown as SectionDoc)));
    } catch (error) {
      next(error);
    }
  });

  /** Homepage as it will look with every draft published. Never exposed publicly. */
  router.get('/admin/preview', async (_request, response, next) => {
    try {
      response.setHeader('Cache-Control', 'no-store');
      response.json(await composeHomepage('draft'));
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/settings', async (_request, response, next) => {
    try {
      response.json(await getSiteSettings());
    } catch (error) {
      next(error);
    }
  });

  router.put('/admin/settings', async (request, response, next) => {
    try {
      const input = siteSettingsSchema.parse(request.body);
      await SiteSettingsModel.findOneAndUpdate(
        { key: 'site' },
        { ...input, key: 'site', updatedBy: request.auth!.userId },
        { upsert: true, runValidators: true },
      );
      response.json(await getSiteSettings());
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function defaultLabel(type: SectionType): string {
  const labels: Record<SectionType, string> = {
    hero: 'Hero',
    stats: 'Statistics',
    destinations: 'Study destinations',
    features: 'Why choose us',
    services: 'Services',
    journey: 'Application journey',
    universities: 'Featured universities',
    intakes: 'Intakes',
    scholarships: 'Scholarships',
    testimonials: 'Success stories',
    blog: 'Insights',
    cta: 'Call to action',
  };
  return labels[type];
}

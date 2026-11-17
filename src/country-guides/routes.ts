import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { CountryGuide } from '../models/country-guide.js';
import { Country } from '../models/education.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const safeLink = z.string().max(2000).refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Use a safe internal path or HTTP/HTTPS URL.');
const optionalUrl = safeLink.optional().or(z.literal(''));
const richBlock = z.object({
  type: z.enum(['PARAGRAPH', 'HEADING', 'BULLET_LIST', 'NUMBERED_LIST', 'QUOTE', 'DIVIDER']),
  text: z.string().max(10000).optional(),
  items: z.array(z.string().max(1000)).max(30).optional(),
  linkText: z.string().max(100).optional(),
  linkUrl: optionalUrl,
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
});
const step = z.object({
  _id: z.string().optional(),
  title: z.string().min(1).max(200),
  shortDescription: z.string().min(1).max(1000),
  estimatedTime: z.string().max(100).optional(),
  icon: z.string().max(50).optional(),
  iconColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  iconBackground: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  cardBackground: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  borderColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  borderRadius: z.number().int().min(0).max(24).optional(),
  fontFamily: z.enum(['Arial', 'DM Sans', 'Manrope', 'Georgia']).optional(),
  titleFontSize: z.number().int().min(14).max(30).optional(),
  bodyFontSize: z.number().int().min(11).max(18).optional(),
  fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  lineHeight: z.number().min(1.2).max(2).optional(),
  letterSpacing: z.number().min(-0.5).max(2).optional(),
  textColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  bodyTextColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  highlightColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  content: z.array(richBlock).max(30).default([]),
  imageUrl: optionalUrl,
  imageAlt: z.string().max(200).optional(),
  documents: z.array(z.string().max(200)).max(30).default([]),
  checklist: z.array(z.string().max(200)).max(30).default([]),
  notice: z.string().max(2000).optional(),
  noticeType: z.enum(['INFO', 'WARNING']).optional(),
  buttonText: z.string().max(80).optional(),
  buttonUrl: optionalUrl,
  badge: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});
const guide = z.object({
  countryId: objectId,
  category: z.string().min(1).max(100),
  slug,
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  description: z.string().max(3000).optional(),
  heroImageUrl: optionalUrl,
  heroImageAlt: z.string().max(200).optional(),
  documents: z.array(z.object({ name: z.string().min(1).max(150), description: z.string().max(500).optional() })).max(50).default([]),
  notes: z.array(z.object({ title: z.string().min(1).max(150), body: z.string().min(1).max(1000), type: z.enum(['INFO', 'WARNING']).default('INFO') })).max(30).default([]),
  benefits: z.array(z.object({ title: z.string().min(1).max(150), description: z.string().max(500), icon: z.string().max(50).optional() })).max(12).default([]),
  ctaTitle: z.string().max(200).optional(),
  ctaDescription: z.string().max(500).optional(),
  ctaButtonText: z.string().max(80).optional(),
  ctaButtonUrl: optionalUrl,
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  displayOrder: z.number().int().min(0).default(0),
  steps: z.array(step).max(100).default([]),
});

function countrySlug(name: string): string {
  return name.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function publishedAt(status: 'DRAFT' | 'PUBLISHED'): Date | undefined {
  return status === 'PUBLISHED' ? new Date() : undefined;
}

export function createCountryGuideRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/public', async (_request, response, next) => {
    try {
      const guides = await CountryGuide.find({ status: 'PUBLISHED' }).sort({ displayOrder: 1, title: 1 }).populate('countryId', 'name code flagUrl');
      response.json(guides);
    } catch (error) { next(error); }
  });

  router.get('/public/:countrySlug/:guideSlug', async (request, response, next) => {
    try {
      const allCountries = await Country.find({ isActive: true }).select('name code flagUrl');
      const country = allCountries.find((item) => countrySlug(item.name) === request.params['countrySlug']);
      if (!country) throw new AppError('Published country guide was not found.', 404);
      const item = await CountryGuide.findOne({ countryId: country._id, slug: request.params['guideSlug'], status: 'PUBLISHED' }).populate('countryId', 'name code flagUrl');
      if (!item) throw new AppError('Published country guide was not found.', 404);
      response.json(item);
    } catch (error) { next(error); }
  });

  router.use(requireAuth(config));

  router.get('/admin', requirePermission('content.manage'), async (_request, response, next) => {
    try { response.json(await CountryGuide.find().sort({ updatedAt: -1 }).populate('countryId', 'name code flagUrl')); } catch (error) { next(error); }
  });

  router.post('/admin', requirePermission('content.manage'), async (request, response, next) => {
    try {
      const input = guide.parse(request.body);
      if (!(await Country.exists({ _id: input.countryId, isActive: true }))) throw new AppError('Active country was not found.', 404);
      const created = await CountryGuide.create({ ...input, updatedBy: request.auth!.userId, publishedAt: publishedAt(input.status) });
      response.status(201).json(created);
    } catch (error) { next(error); }
  });

  router.patch('/admin/:id', requirePermission('content.manage'), async (request, response, next) => {
    try {
      objectId.parse(request.params['id']);
      const input = guide.partial().parse(request.body);
      if (input.countryId && !(await Country.exists({ _id: input.countryId, isActive: true }))) throw new AppError('Active country was not found.', 404);
      const updated = await CountryGuide.findByIdAndUpdate(request.params['id'], {
        ...input,
        ...(input.status ? { publishedAt: input.status === 'PUBLISHED' ? new Date() : null } : {}),
        updatedBy: request.auth!.userId,
      }, { new: true, runValidators: true }).populate('countryId', 'name code flagUrl');
      if (!updated) throw new AppError('Country guide was not found.', 404);
      response.json(updated);
    } catch (error) { next(error); }
  });

  router.delete('/admin/:id', requirePermission('content.manage'), async (request, response, next) => {
    try {
      const id = objectId.parse(request.params['id']);
      const deleted = await CountryGuide.findByIdAndDelete(id);
      if (!deleted) throw new AppError('Country guide was not found.', 404);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  return router;
}

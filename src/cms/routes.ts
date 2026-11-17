import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { AnalyticsEvent, BlogPost, ContentPage } from '../models/cms.js';
import { Application } from '../models/application.js';
import { Lead } from '../models/crm.js';
import { Invoice, Payment } from '../models/finance.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const contentSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});
const blogSchema = contentSchema.extend({ coverImageUrl: z.string().url().optional(), category: z.string().trim().max(60).optional(), tags: z.array(z.string().max(50)).max(20).default([]) });
const eventSchema = z.object({ name: z.string().min(1).max(100), path: z.string().min(1).max(500), sessionId: z.string().max(200).optional(), metadata: z.record(z.string(), z.unknown()).optional(), occurredAt: z.coerce.date().optional() });
const reportQuery = z.object({ from: z.coerce.date(), to: z.coerce.date() });

function publishDate(status: 'DRAFT' | 'PUBLISHED'): Date | undefined {
  return status === 'PUBLISHED' ? new Date() : undefined;
}

function csvEscape(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

interface CsvResponse {
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

function csvResponse(response: CsvResponse, filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.send(`${csv}\r\n`);
}

export function createCmsRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/pages/:slug', async (request, response, next) => {
    try {
      const page = await ContentPage.findOne({ slug: request.params['slug'], status: 'PUBLISHED' });
      if (!page) throw new AppError('Published page was not found.', 404);
      response.json(page);
    } catch (error) { next(error); }
  });

  router.get('/blog', async (_request, response, next) => {
    try { response.json(await BlogPost.find({ status: 'PUBLISHED' }).sort({ publishedAt: -1 })); } catch (error) { next(error); }
  });

  router.get('/blog/:slug', async (request, response, next) => {
    try {
      const post = await BlogPost.findOne({ slug: request.params['slug'], status: 'PUBLISHED' });
      if (!post) throw new AppError('Published blog post was not found.', 404);
      response.json(post);
    } catch (error) { next(error); }
  });

  router.post('/analytics/events', async (request, response, next) => {
    try {
      const input = eventSchema.parse(request.body);
      const event = await AnalyticsEvent.create({ ...input, occurredAt: input.occurredAt ?? new Date() });
      response.status(201).json({ accepted: true, id: event._id });
    } catch (error) { next(error); }
  });

  router.use(requireAuth(config));

  router.post('/pages', requirePermission('content.manage'), async (request, response, next) => {
    try {
      const input = contentSchema.parse(request.body);
      response.status(201).json(await ContentPage.create({ ...input, publishedAt: publishDate(input.status), updatedBy: request.auth!.userId }));
    } catch (error) { next(error); }
  });

  router.patch('/pages/:id', requirePermission('content.manage'), async (request, response, next) => {
    try {
      const input = contentSchema.partial().parse(request.body);
      const page = await ContentPage.findByIdAndUpdate(request.params['id'], { ...input, ...(input.status ? { publishedAt: publishDate(input.status) } : {}), updatedBy: request.auth!.userId }, { new: true, runValidators: true });
      if (!page) throw new AppError('Content page was not found.', 404);
      response.json(page);
    } catch (error) { next(error); }
  });

  router.post('/blog', requirePermission('content.manage'), async (request, response, next) => {
    try {
      const input = blogSchema.parse(request.body);
      response.status(201).json(await BlogPost.create({ ...input, publishedAt: publishDate(input.status), authorId: request.auth!.userId }));
    } catch (error) { next(error); }
  });

  router.patch('/blog/:id', requirePermission('content.manage'), async (request, response, next) => {
    try {
      const input = blogSchema.partial().parse(request.body);
      const post = await BlogPost.findByIdAndUpdate(request.params['id'], { ...input, ...(input.status ? { publishedAt: publishDate(input.status) } : {}) }, { new: true, runValidators: true });
      if (!post) throw new AppError('Blog post was not found.', 404);
      response.json(post);
    } catch (error) { next(error); }
  });

  router.get('/reports/overview', requirePermission('report.view'), async (request, response, next) => {
    try {
      const range = reportQuery.parse(request.query);
      if (range.from >= range.to) throw new AppError('Report start must be before report end.', 400);
      const [leads, applications, invoices, payments] = await Promise.all([
        Lead.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } }),
        Application.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } }),
        Invoice.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } }),
        Payment.aggregate([{ $match: { receivedAt: { $gte: range.from, $lt: range.to } } }, { $group: { _id: '$currency', totalMinor: { $sum: '$amountMinor' }, count: { $sum: 1 } } }]),
      ]);
      response.json({ range, leads, applications, invoices, payments });
    } catch (error) { next(error); }
  });

  router.get('/reports/payments.csv', requirePermission('report.export'), async (request, response, next) => {
    try {
      const range = reportQuery.parse(request.query);
      const payments = await Payment.find({ receivedAt: { $gte: range.from, $lt: range.to } }).sort({ receivedAt: 1 });
      csvResponse(response, 'payments.csv', ['id', 'invoiceId', 'amountMinor', 'currency', 'method', 'receivedAt'], payments.map((payment) => [payment._id, payment.invoiceId, payment.amountMinor, payment.currency, payment.method, payment.receivedAt]));
    } catch (error) { next(error); }
  });

  return router;
}

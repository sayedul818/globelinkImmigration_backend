import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { Consultation, CrmActivity, CustomerProfile, FollowUp, Lead } from '../models/crm.js';
import { rateLimit } from '../lib/rate-limit.js';

/** Source label for leads created by the public "Book a consultation" form. */
export const WEBSITE_CONSULTATION_SOURCE = 'Website consultation';

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);

/** Public consultation request. Validated strictly because it is unauthenticated input. */
export const consultationRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'Please enter your first name.').max(80),
  lastName: z.string().trim().min(1, 'Please enter your last name.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  phone: z.string().trim().min(6, 'Please enter a phone number.').max(40).regex(/^[+\d\s()-]+$/, 'Use digits, spaces, +, - or brackets.'),
  destination: optionalText(80),
  studyLevel: optionalText(80),
  currentEducation: optionalText(80),
  intake: optionalText(80),
  consultationMethod: optionalText(60),
  preferredContact: z.enum(['PHONE', 'WHATSAPP', 'EMAIL']).optional(),
  preferredDate: z.coerce.date().optional(),
  message: optionalText(2000),
  consent: z.literal(true, { message: 'Please agree to the privacy policy.' }),
  pagePath: optionalText(300),
  /** Honeypot: must stay empty. Real visitors never see this field. */
  website: z.string().max(0).optional(),
});

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  source: z.string().min(1),
  notes: z.string().max(5000).optional(),
  nextFollowUpAt: z.coerce.date().optional(),
});
const assignmentSchema = z.object({ assignedTo: z.string().min(1) });
const consultationSchema = z.object({ scheduledAt: z.coerce.date(), status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('SCHEDULED'), notes: z.string().max(5000).optional() });
const followUpSchema = z.object({ dueAt: z.coerce.date(), channel: z.enum(['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING']), note: z.string().min(1).max(5000) });
const listSchema = z.object({ source: z.enum(['website']).optional(), status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']).optional(), assignedTo: z.string().optional(), search: z.string().max(100).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function activity(leadId: unknown, actorId: string | undefined, action: string, details?: unknown) {
  await CrmActivity.create({ leadId, actorId, action, details });
}

export function createCrmRouter(config: AppConfig): Router {
  const router = Router();

  /* ---------------- Public: website consultation requests ---------------- */

  const consultationLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: 5,
    message: 'Too many requests. Please wait a few minutes and try again.',
  });

  router.post('/public/consultations', consultationLimiter, async (request, response, next) => {
    try {
      // Bots that fill the hidden field get a normal-looking reply but nothing is stored.
      if (typeof request.body?.website === 'string' && request.body.website.length > 0) {
        response.status(202).json({ received: true });
        return;
      }
      const input = consultationRequestSchema.parse(request.body);
      const { firstName, lastName, email, phone, consent, website, ...details } = input;
      void consent, void website;
      const lead = await Lead.create({
        firstName,
        lastName,
        email,
        phone,
        source: WEBSITE_CONSULTATION_SOURCE,
        status: 'NEW',
        notes: details.message,
        inquiry: { ...details, consentAt: new Date() },
      });
      await activity(lead._id, undefined, 'WEBSITE_CONSULTATION_REQUESTED', { destination: details.destination });
      response.status(201).json({ received: true, reference: lead._id.toString().slice(-6).toUpperCase() });
    } catch (error) { next(error); }
  });

  /* ---------------- Staff ---------------- */

  router.use(requireAuth(config));

  router.get('/leads', requirePermission('lead.read'), async (request, response, next) => {
    try {
      const query = listSchema.parse(request.query);
      const filter: Record<string, unknown> = {};
      if (query.status) filter['status'] = query.status;
      if (query.source === 'website') filter['source'] = WEBSITE_CONSULTATION_SOURCE;
      if (query.assignedTo) filter['assignedTo'] = query.assignedTo;
      if (['EDUCATION_COUNSELLOR', 'SENIOR_EDUCATION_COUNSELLOR'].includes(request.auth!.role)) {
        filter['$or'] = [{ assignedTo: request.auth!.userId }, { createdBy: request.auth!.userId }];
      }
      if (query.search) {
        const search = new RegExp(escapeRegex(query.search), 'i');
        const searchFilter = [{ email: search }, { firstName: search }, { lastName: search }];
        filter['$and'] = [...(Array.isArray(filter['$and']) ? filter['$and'] : []), { $or: searchFilter }];
      }
      const skip = (query.page - 1) * query.pageSize;
      const [leads, total] = await Promise.all([
        Lead.find(filter).populate('assignedTo', 'firstName lastName email').sort({ createdAt: -1 }).skip(skip).limit(query.pageSize),
        Lead.countDocuments(filter),
      ]);
      response.json({ data: leads, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
    } catch (error) { next(error); }
  });

  router.post('/leads', requirePermission('lead.create'), async (request, response, next) => {
    try {
      const input = leadSchema.parse(request.body);
      const lead = await Lead.create({ ...input, createdBy: request.auth!.userId });
      await activity(lead._id, request.auth!.userId, 'LEAD_CREATED');
      response.status(201).json(lead);
    } catch (error) { next(error); }
  });

  router.patch('/leads/:id', requirePermission('lead.update'), async (request, response, next) => {
    try {
      const input = leadSchema.partial().extend({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']).optional() }).parse(request.body);
      const lead = await Lead.findByIdAndUpdate(request.params['id'], input, { new: true, runValidators: true });
      if (!lead) throw new AppError('Lead was not found.', 404);
      await activity(lead._id, request.auth!.userId, 'LEAD_UPDATED');
      response.json(lead);
    } catch (error) { next(error); }
  });

  router.post('/leads/:id/assign', requirePermission('lead.assign'), async (request, response, next) => {
    try {
      const input = assignmentSchema.parse(request.body);
      const lead = await Lead.findByIdAndUpdate(request.params['id'], { assignedTo: input.assignedTo, status: 'CONTACTED' }, { new: true });
      if (!lead) throw new AppError('Lead was not found.', 404);
      await activity(lead._id, request.auth!.userId, 'LEAD_ASSIGNED', { assignedTo: input.assignedTo });
      response.json(lead);
    } catch (error) { next(error); }
  });

  router.post('/leads/:id/convert', requirePermission('lead.convert'), async (request, response, next) => {
    try {
      const lead = await Lead.findById(request.params['id']);
      if (!lead) throw new AppError('Lead was not found.', 404);
      if (lead.status === 'CONVERTED' && lead.convertedCustomerId) throw new AppError('Lead has already been converted.', 409);
      const customer = await CustomerProfile.create({ leadId: lead._id, firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone, assignedCounsellorId: lead.assignedTo });
      lead.status = 'CONVERTED';
      lead.convertedCustomerId = customer._id;
      await lead.save();
      await activity(lead._id, request.auth!.userId, 'LEAD_CONVERTED', { customerId: customer._id });
      response.status(201).json(customer);
    } catch (error) { next(error); }
  });

  router.get('/customers', requirePermission('student.create'), async (_request, response, next) => {
    try {
      response.json(await CustomerProfile.find({ lifecycle: { $ne: 'INACTIVE' } }).sort({ createdAt: -1 }).select('firstName lastName email phone lifecycle'));
    } catch (error) { next(error); }
  });

  router.get('/leads/:id/activities', requirePermission('lead.read'), async (request, response, next) => {
    try { response.json(await CrmActivity.find({ leadId: request.params['id'] }).sort({ createdAt: -1 })); } catch (error) { next(error); }
  });

  router.post('/leads/:id/consultations', requirePermission('consultation.manage'), async (request, response, next) => {
    try {
      const input = consultationSchema.parse(request.body);
      const lead = await Lead.findById(request.params['id']);
      if (!lead) throw new AppError('Lead was not found.', 404);
      const consultation = await Consultation.create({ ...input, leadId: lead._id, counsellorId: request.auth!.userId });
      await activity(lead._id, request.auth!.userId, 'CONSULTATION_CREATED', { consultationId: consultation._id });
      response.status(201).json(consultation);
    } catch (error) { next(error); }
  });

  router.post('/leads/:id/follow-ups', requirePermission('followup.manage'), async (request, response, next) => {
    try {
      const input = followUpSchema.parse(request.body);
      const lead = await Lead.findByIdAndUpdate(request.params['id'], { nextFollowUpAt: input.dueAt }, { new: true });
      if (!lead) throw new AppError('Lead was not found.', 404);
      const followUp = await FollowUp.create({ ...input, leadId: lead._id, assignedTo: lead.assignedTo ?? request.auth!.userId });
      await activity(lead._id, request.auth!.userId, 'FOLLOW_UP_CREATED', { followUpId: followUp._id });
      response.status(201).json(followUp);
    } catch (error) { next(error); }
  });

  return router;
}

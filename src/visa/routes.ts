import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { Application } from '../models/application.js';
import { Country, Student } from '../models/education.js';
import { StudentDocument } from '../models/application.js';
import { VisaAppointment, VisaCase, VisaChecklist, VisaRequirement } from '../models/visa.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const statuses = ['DRAFT', 'DOCUMENTS_PENDING', 'READY_TO_FILE', 'SUBMITTED', 'BIOMETRICS_SCHEDULED', 'INTERVIEW_SCHEDULED', 'DECISION_PENDING', 'APPROVED', 'REFUSED', 'WITHDRAWN'] as const;
const caseSchema = z.object({ studentId: objectId, countryId: objectId, applicationId: objectId, notes: z.string().max(5000).optional() });
const statusSchema = z.object({ status: z.enum(statuses), note: z.string().max(2000).optional() });
const requirementSchema = z.object({ countryId: objectId, name: z.string().min(1), description: z.string().max(5000).optional(), documentType: z.string().min(1), sourceUrl: z.string().url(), isRequired: z.boolean().default(true) });
const checklistSchema = z.object({ requirementId: objectId, documentId: objectId.optional(), status: z.enum(['PENDING', 'UPLOADED', 'VERIFIED', 'NOT_APPLICABLE']), note: z.string().max(2000).optional() });
const appointmentSchema = z.object({ type: z.enum(['BIOMETRICS', 'INTERVIEW', 'MEDICAL', 'PASSPORT_SUBMISSION']), scheduledAt: z.coerce.date(), location: z.string().min(1), status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED']).default('SCHEDULED'), notes: z.string().max(2000).optional() });

const transitions: Record<(typeof statuses)[number], readonly (typeof statuses)[number][]> = {
  DRAFT: ['DOCUMENTS_PENDING', 'WITHDRAWN'],
  DOCUMENTS_PENDING: ['READY_TO_FILE', 'WITHDRAWN'],
  READY_TO_FILE: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['BIOMETRICS_SCHEDULED', 'INTERVIEW_SCHEDULED', 'DECISION_PENDING', 'WITHDRAWN'],
  BIOMETRICS_SCHEDULED: ['INTERVIEW_SCHEDULED', 'DECISION_PENDING', 'WITHDRAWN'],
  INTERVIEW_SCHEDULED: ['DECISION_PENDING', 'WITHDRAWN'],
  DECISION_PENDING: ['APPROVED', 'REFUSED', 'WITHDRAWN'],
  APPROVED: [],
  REFUSED: [],
  WITHDRAWN: [],
};

export function createVisaRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/cases', requirePermission('visa.read'), async (_request, response, next) => {
    try { response.json(await VisaCase.find().populate('studentId countryId applicationId assignedOfficerId').sort({ createdAt: -1 })); } catch (error) { next(error); }
  });

  router.post('/cases', requirePermission('visa.create'), async (request, response, next) => {
    try {
      const input = caseSchema.parse(request.body);
      const [student, country, application] = await Promise.all([Student.findById(input.studentId), Country.findById(input.countryId), Application.findById(input.applicationId)]);
      if (!student || !country || !application) throw new AppError('Student, country, and application must exist.', 400);
      if (application.studentId.toString() !== input.studentId) throw new AppError('Application does not belong to this student.', 400);
      const visaCase = await VisaCase.create({ ...input, statusHistory: [{ status: 'DRAFT', changedBy: request.auth!.userId }] });
      response.status(201).json(visaCase);
    } catch (error) { next(error); }
  });

  router.patch('/cases/:id/assign', requirePermission('visa.assign'), async (request, response, next) => {
    try {
      const officerId = objectId.parse(request.body['assignedOfficerId']);
      const visaCase = await VisaCase.findByIdAndUpdate(request.params['id'], { assignedOfficerId: officerId }, { new: true });
      if (!visaCase) throw new AppError('Visa case was not found.', 404);
      response.json(visaCase);
    } catch (error) { next(error); }
  });

  router.patch('/cases/:id/status', requirePermission('visa.update'), async (request, response, next) => {
    try {
      const input = statusSchema.parse(request.body);
      const visaCase = await VisaCase.findById(request.params['id']);
      if (!visaCase) throw new AppError('Visa case was not found.', 404);
      if (!transitions[visaCase.status as (typeof statuses)[number]].includes(input.status)) throw new AppError(`Cannot change visa status from ${visaCase.status} to ${input.status}.`, 400);
      visaCase.status = input.status;
      visaCase.statusHistory.push({ status: input.status, changedBy: request.auth!.userId, note: input.note, changedAt: new Date() });
      await visaCase.save();
      response.json(visaCase);
    } catch (error) { next(error); }
  });

  router.get('/cases/:id/history', requirePermission('visa.read'), async (request, response, next) => {
    try {
      const visaCase = await VisaCase.findById(request.params['id']).select('statusHistory');
      if (!visaCase) throw new AppError('Visa case was not found.', 404);
      response.json(visaCase.statusHistory);
    } catch (error) { next(error); }
  });

  router.get('/requirements', requirePermission('visa.read'), async (request, response, next) => {
    try { response.json(await VisaRequirement.find({ countryId: objectId.parse(request.query['countryId']), isActive: true }).sort({ name: 1 })); } catch (error) { next(error); }
  });

  router.post('/requirements', requirePermission('visa.requirement.manage'), async (request, response, next) => {
    try {
      const input = requirementSchema.parse(request.body);
      if (!(await Country.exists({ _id: input.countryId }))) throw new AppError('Country was not found.', 404);
      response.status(201).json(await VisaRequirement.create(input));
    } catch (error) { next(error); }
  });

  router.get('/cases/:id/checklist', requirePermission('visa.read'), async (request, response, next) => {
    try { response.json(await VisaChecklist.find({ visaCaseId: request.params['id'] }).populate('requirementId documentId')); } catch (error) { next(error); }
  });

  router.post('/cases/:id/checklist', requirePermission('visa.update'), async (request, response, next) => {
    try {
      const input = checklistSchema.parse(request.body);
      const visaCase = await VisaCase.findById(request.params['id']);
      const requirement = await VisaRequirement.findById(input.requirementId);
      if (!visaCase || !requirement || requirement.countryId.toString() !== visaCase.countryId.toString()) throw new AppError('Visa case and requirement do not match.', 400);
      if (input.documentId && !(await StudentDocument.exists({ _id: input.documentId, studentId: visaCase.studentId }))) throw new AppError('Document does not belong to this student.', 400);
      response.status(201).json(await VisaChecklist.findOneAndUpdate({ visaCaseId: visaCase._id, requirementId: requirement._id }, input, { upsert: true, new: true, runValidators: true }));
    } catch (error) { next(error); }
  });

  router.get('/cases/:id/appointments', requirePermission('visa.read'), async (request, response, next) => {
    try { response.json(await VisaAppointment.find({ visaCaseId: request.params['id'] }).sort({ scheduledAt: 1 })); } catch (error) { next(error); }
  });

  router.post('/cases/:id/appointments', requirePermission('visa.update'), async (request, response, next) => {
    try {
      if (!(await VisaCase.exists({ _id: request.params['id'] }))) throw new AppError('Visa case was not found.', 404);
      response.status(201).json(await VisaAppointment.create({ ...appointmentSchema.parse(request.body), visaCaseId: request.params['id'] }));
    } catch (error) { next(error); }
  });

  return router;
}

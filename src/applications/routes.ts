import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { Application, StudentDocument } from '../models/application.js';
import { Intake, Program, Student, University } from '../models/education.js';
import { Assessment } from '../models/assessment.js';
import { StudentWorkflow } from '../models/student-workflow.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const statuses = ['DRAFT', 'READY_TO_SUBMIT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
const applicationSchema = z.object({
  studentId: objectId,
  universityId: objectId,
  programId: objectId,
  intakeId: objectId,
  deadline: z.coerce.date(),
  notes: z.string().max(5000).optional(),
});
const statusSchema = z.object({ status: z.enum(statuses), note: z.string().max(2000).optional() });
const documentSchema = z.object({
  studentId: objectId,
  applicationId: objectId.optional(),
  documentType: z.enum(['PASSPORT', 'TRANSCRIPT', 'CERTIFICATE', 'ENGLISH_TEST', 'STATEMENT_OF_PURPOSE', 'REFERENCE', 'OFFER_LETTER', 'FINANCIAL_PROOF', 'OTHER']),
  originalName: z.string().min(1).max(255),
  storageKey: z.string().min(1).max(500),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});
const reviewSchema = z.object({ status: z.enum(['UNDER_REVIEW', 'VERIFIED', 'REJECTED']), reviewNote: z.string().max(2000).optional() });
const listSchema = z.object({ studentId: objectId.optional(), status: z.enum(statuses).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
const assessmentSchema = z.object({
  studentId: objectId, purpose: z.string().max(500).optional(), targetCountry: objectId.optional(), age: z.number().nonnegative().optional(), maritalStatus: z.string().optional(), highestQualification: z.string().optional(), lastInstitutionYear: z.string().optional(), studyGapYears: z.number().nonnegative().optional(), workExperienceYears: z.number().nonnegative().optional(), currentOccupationEmployer: z.string().optional(), annualBudget: z.number().nonnegative().optional(), fundingSource: z.string().optional(), sponsorNameRelation: z.string().optional(), sponsorIncome: z.number().nonnegative().optional(), bankBalanceRange: z.string().optional(), propertyAssets: z.string().optional(), countriesVisited: z.string().optional(), previousVisas: z.string().optional(), visaRefusal: z.boolean().optional(), refusalDetails: z.string().optional(), riskIndicators: z.array(z.string()).optional(),
  scores: z.object({ academicProfile: z.number().int().min(1).max(5), englishProficiency: z.number().int().min(1).max(5), financialCapacity: z.number().int().min(1).max(5), travelVisaHistory: z.number().int().min(1).max(5), documentReadiness: z.number().int().min(1).max(5), notes: z.string().optional() }),
  scoreNotes: z.object({ academicProfile: z.string().optional(), englishProficiency: z.string().optional(), financialCapacity: z.string().optional(), travelVisaHistory: z.string().optional(), documentReadiness: z.string().optional() }).optional(),
  recommendedCountryProgram: z.string().optional(), recommendedVisaRoute: z.string().optional(), estimatedTimeline: z.string().optional(), estimatedTotalCost: z.string().optional(), counsellorNotes: z.string().optional(), nextSteps: z.string().optional(),
});
const workflowSchema = z.object({
  documentChecklist: z.array(z.object({ number: z.number().int().positive().optional(), category: z.string().optional(), name: z.string().min(1), required: z.boolean().optional(), received: z.boolean().optional(), receivedAt: z.coerce.date().optional(), custodyStatus: z.enum(['O', 'C', 'A']).optional(), remarks: z.string().optional() })).optional(),
  clientDeclaration: z.object({ accepted: z.boolean(), signedAt: z.coerce.date().optional(), notes: z.string().optional(), passportOrNid: z.string().optional(), date: z.coerce.date().optional(), statements: z.array(z.boolean()).optional(), dataConsents: z.array(z.boolean()).optional(), guardianName: z.string().optional(), guardianRelationship: z.string().optional(), guardianDate: z.coerce.date().optional(), witnessNameDesignation: z.string().optional() }).optional(),
  termsConditions: z.object({ accepted: z.boolean(), acceptedAt: z.coerce.date().optional(), notes: z.string().optional() }).optional(),
  moneyReceipt: z.object({ clientCopy: z.string().optional(), officeCopy: z.string().optional(), receiptNumber: z.string().optional(), date: z.coerce.date().optional(), receivedWithThanksFrom: z.string().optional(), amountInWords: z.string().optional(), amount: z.number().nonnegative().optional(), paymentMode: z.string().optional(), paymentReceivedFor: z.array(z.string()).optional(), cashChequeRef: z.string().optional(), bankWallet: z.string().optional(), totalFee: z.number().nonnegative().optional(), paidToDate: z.number().nonnegative().optional(), thisPayment: z.number().nonnegative().optional(), balanceDue: z.number().nonnegative().optional(), currency: z.string().length(3).optional(), receivedAt: z.coerce.date().optional(), notes: z.string().optional() }).optional(),
  officialInvoice: z.object({ invoiceNumber: z.string().optional(), amount: z.number().nonnegative().optional(), currency: z.string().length(3).optional(), issuedAt: z.coerce.date().optional(), dueAt: z.coerce.date().optional(), clientAddress: z.string().optional(), serviceType: z.string().optional(), amountInWords: z.string().optional(), items: z.array(z.object({ description: z.string().optional(), quantity: z.number().nonnegative().optional(), unitPrice: z.number().nonnegative().optional(), amount: z.number().nonnegative().optional() })).optional(), subtotal: z.number().nonnegative().optional(), discount: z.number().nonnegative().optional(), tax: z.number().nonnegative().optional(), total: z.number().nonnegative().optional(), amountPaid: z.number().nonnegative().optional(), balanceDue: z.number().nonnegative().optional(), bankName: z.string().optional(), accountName: z.string().optional(), accountNumber: z.string().optional(), branchRouting: z.string().optional(), bKashNagadOther: z.string().optional(), paymentReference: z.string().optional(), notes: z.string().optional() }).optional(),
  refundCancellationPolicy: z.object({ acknowledged: z.boolean(), notes: z.string().optional(), clientName: z.string().optional(), clientId: z.string().optional(), date: z.coerce.date().optional() }).optional(),
});

const transitions: Record<(typeof statuses)[number], readonly (typeof statuses)[number][]> = {
  DRAFT: ['READY_TO_SUBMIT', 'WITHDRAWN'],
  READY_TO_SUBMIT: ['DRAFT', 'SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'WITHDRAWN'],
  UNDER_REVIEW: ['OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN'],
  OFFER_RECEIVED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

async function assertReferences(input: z.infer<typeof applicationSchema>) {
  const [student, university, program, intake] = await Promise.all([
    Student.findById(input.studentId),
    University.findById(input.universityId),
    Program.findById(input.programId),
    Intake.findById(input.intakeId),
  ]);
  if (!student || !university || !program || !intake) throw new AppError('Student, university, program, and intake must all exist.', 400);
  if (program.universityId.toString() !== university._id.toString() || intake.programId.toString() !== program._id.toString()) {
    throw new AppError('The selected university, program, and intake do not match.', 400);
  }
  if (!intake.isOpen) throw new AppError('The selected intake is closed.', 400);
}

export function createApplicationsRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/', requirePermission('application.read'), async (request, response, next) => {
    try {
      const query = listSchema.parse(request.query);
      const filter: Record<string, unknown> = {};
      if (query.studentId) filter['studentId'] = query.studentId;
      if (query.status) filter['status'] = query.status;
      const skip = (query.page - 1) * query.pageSize;
      const [data, total] = await Promise.all([
        Application.find(filter).populate('studentId universityId programId intakeId').sort({ createdAt: -1 }).skip(skip).limit(query.pageSize),
        Application.countDocuments(filter),
      ]);
      response.json({ data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
    } catch (error) { next(error); }
  });

  router.post('/', requirePermission('application.create'), async (request, response, next) => {
    try {
      const input = applicationSchema.parse(request.body);
      await assertReferences(input);
      const application = await Application.create({ ...input, createdBy: request.auth!.userId, statusHistory: [{ status: 'DRAFT', changedBy: request.auth!.userId }] });
      response.status(201).json(application);
    } catch (error) { next(error); }
  });

  router.get('/assessments', requirePermission('application.read'), async (request, response, next) => {
    try {
      const studentId = objectId.parse(request.query['studentId']);
      const assessment = await Assessment.findOne({ studentId });
      response.json(assessment);
    } catch (error) { next(error); }
  });

  router.get('/student-workflow/:studentId', requirePermission('application.read'), async (request, response, next) => {
    try {
      if (!(await Student.exists({ _id: request.params['studentId'] }))) throw new AppError('Student was not found.', 404);
      response.json(await StudentWorkflow.findOne({ studentId: request.params['studentId'] }));
    } catch (error) { next(error); }
  });

  router.put('/student-workflow/:studentId', requirePermission('application.update'), async (request, response, next) => {
    try {
      const studentId = objectId.parse(request.params['studentId']);
      if (!(await Student.exists({ _id: studentId }))) throw new AppError('Student was not found.', 404);
      const input = workflowSchema.parse(request.body);
      response.json(await StudentWorkflow.findOneAndUpdate({ studentId }, { ...input, studentId, updatedBy: request.auth!.userId }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }));
    } catch (error) { next(error); }
  });

  router.post('/assessments', requirePermission('application.create'), async (request, response, next) => {
    try {
      const input = assessmentSchema.parse(request.body);
      if (!(await Student.exists({ _id: input.studentId }))) throw new AppError('Student was not found.', 404);
      const totalScore = Object.values(input.scores).filter((value): value is number => typeof value === 'number').reduce((total, score) => total + score, 0);
      const suitability = totalScore >= 20 ? 'HIGH' : totalScore >= 14 ? 'MEDIUM' : 'LOW';
      response.status(201).json(await Assessment.create({ ...input, totalScore, suitability, assessedBy: request.auth!.userId }));
    } catch (error) { next(error); }
  });

  router.patch('/assessments/:id', requirePermission('application.update'), async (request, response, next) => {
    try {
      const input = assessmentSchema.omit({ studentId: true }).parse(request.body);
      const totalScore = Object.values(input.scores).filter((value): value is number => typeof value === 'number').reduce((total, score) => total + score, 0);
      const suitability = totalScore >= 20 ? 'HIGH' : totalScore >= 14 ? 'MEDIUM' : 'LOW';
      const assessment = await Assessment.findByIdAndUpdate(request.params['id'], { ...input, totalScore, suitability, assessedBy: request.auth!.userId, assessedAt: new Date() }, { new: true, runValidators: true });
      if (!assessment) throw new AppError('Assessment was not found.', 404);
      response.json(assessment);
    } catch (error) { next(error); }
  });

  router.patch('/:id/status', requirePermission('application.update'), async (request, response, next) => {
    try {
      const input = statusSchema.parse(request.body);
      const application = await Application.findById(request.params['id']);
      if (!application) throw new AppError('Application was not found.', 404);
      if (!transitions[application.status as (typeof statuses)[number]].includes(input.status)) {
        throw new AppError(`Cannot change application status from ${application.status} to ${input.status}.`, 400);
      }
      application.status = input.status;
      if (input.status === 'SUBMITTED') application.submittedAt = new Date();
      application.statusHistory.push({ status: input.status, changedBy: request.auth!.userId, note: input.note, changedAt: new Date() });
      await application.save();
      response.json(application);
    } catch (error) { next(error); }
  });

  router.get('/:id/history', requirePermission('application.read'), async (request, response, next) => {
    try {
      const application = await Application.findById(request.params['id']).select('statusHistory');
      if (!application) throw new AppError('Application was not found.', 404);
      response.json(application.statusHistory);
    } catch (error) { next(error); }
  });

  router.get('/:id/deadline', requirePermission('application.read'), async (request, response, next) => {
    try {
      const application = await Application.findById(request.params['id']).select('deadline status');
      if (!application) throw new AppError('Application was not found.', 404);
      response.json({ deadline: application.deadline, status: application.status, overdue: application.deadline < new Date() && !['ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(application.status) });
    } catch (error) { next(error); }
  });

  router.get('/documents', requirePermission('document.read'), async (request, response, next) => {
    try {
      const studentId = objectId.parse(request.query['studentId']);
      response.json(await StudentDocument.find({ studentId }).sort({ createdAt: -1 }));
    } catch (error) { next(error); }
  });

  router.post('/documents', requirePermission('document.upload'), async (request, response, next) => {
    try {
      const input = documentSchema.parse(request.body);
      if (!(await Student.exists({ _id: input.studentId }))) throw new AppError('Student was not found.', 404);
      if (input.applicationId && !(await Application.exists({ _id: input.applicationId, studentId: input.studentId }))) throw new AppError('Application does not belong to this student.', 400);
      response.status(201).json(await StudentDocument.create({ ...input, uploadedBy: request.auth!.userId }));
    } catch (error) { next(error); }
  });

  router.patch('/documents/:id/review', requirePermission('document.review'), async (request, response, next) => {
    try {
      const input = reviewSchema.parse(request.body);
      const document = await StudentDocument.findByIdAndUpdate(request.params['id'], { ...input, reviewedBy: request.auth!.userId, reviewedAt: new Date() }, { new: true, runValidators: true });
      if (!document) throw new AppError('Document was not found.', 404);
      response.json(document);
    } catch (error) { next(error); }
  });

  return router;
}

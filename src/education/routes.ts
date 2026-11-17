import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { Country, Intake, Program, Scholarship, Student, University } from '../models/education.js';
import { Application } from '../models/application.js';
import { Counter } from '../models/counter.js';
import { slugify } from '../lib/slug.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const pageSchema = z.object({ search: z.string().max(100).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(250).default(25) });
const countrySchema = z.object({ name: z.string().min(1), code: z.string().length(2), description: z.string().max(5000).optional(), flagUrl: z.string().url().optional(), tuitionInformation: z.string().max(5000).optional(), livingCosts: z.string().max(5000).optional(), admissionRequirements: z.string().max(5000).optional(), visaGuidance: z.string().max(5000).optional(), popularCourses: z.array(z.string()).optional() });
const publicProfileSchema = z.object({
  overview: z.string().max(15000).optional(),
  costOfLiving: z.string().max(5000).optional(),
  mapUrl: z.string().url().refine((value) => /^https?:\/\//i.test(value), 'Map URL must use HTTP or HTTPS.').optional(),
  metrics: z.array(z.object({
    label: z.string().min(1).max(60),
    value: z.string().min(1).max(100),
    detail: z.string().max(120).optional(),
  })).max(8).optional(),
  highlights: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
  })).max(12).optional(),
  faqs: z.array(z.object({
    question: z.string().min(1).max(300),
    answer: z.string().min(1).max(2000),
  })).max(20).optional(),
});
const universitySchema = z.object({
  name: z.string().min(1), countryId: objectId, website: z.string().url().optional(), description: z.string().max(5000).optional(),
  logoUrl: z.string().url().optional(), location: z.object({ address: z.string().max(500).optional(), city: z.string().max(100).optional(), state: z.string().max(100).optional(), postalCode: z.string().max(30).optional() }).optional(),
  contact: z.object({ email: z.string().email().optional(), phone: z.string().max(50).optional() }).optional(),
  media: z.object({ campusImageUrl: z.string().url().optional(), brochureUrl: z.string().url().optional() }).optional(),
  availablePrograms: z.string().max(10000).optional(),
  programDetails: z.array(z.object({
    name: z.string().min(1),
    level: z.enum(['FOUNDATION', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH']).optional(),
    subject: z.string().max(200).optional(),
    durationMonths: z.number().int().positive().optional(),
    intake: z.string().max(100).optional(),
    englishRequirements: z.string().max(1000).optional(),
    admissionRequirements: z.string().max(10000).optional(),
    tuitionFees: z.string().max(5000).optional(),
    scholarshipInformation: z.string().max(5000).optional(),
  })).optional(),
  admissionRequirements: z.string().max(10000).optional(), tuitionFees: z.string().max(5000).optional(), scholarshipInformation: z.string().max(5000).optional(),
  publicProfile: publicProfileSchema.optional(),
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(), isActive: z.boolean().optional(),
});
const programSchema = z.object({ universityId: objectId, name: z.string().min(1), level: z.enum(['FOUNDATION', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH']), subject: z.string().min(1), durationMonths: z.number().int().positive().optional(), tuitionAmount: z.number().nonnegative().optional(), currency: z.string().length(3).optional(), intake: z.string().optional() });
const intakeSchema = z.object({ programId: objectId, name: z.string().min(1), startsOn: z.coerce.date(), applicationDeadline: z.coerce.date() });
const scholarshipSchema = z.object({ name: z.string().min(1), provider: z.string().min(1), countryId: objectId.optional(), universityId: objectId.optional(), level: z.enum(['FOUNDATION', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH']), subject: z.string().optional(), fundingType: z.enum(['FULL', 'PARTIAL', 'FIXED_AMOUNT']), amount: z.number().nonnegative().optional(), currency: z.string().length(3).optional(), deadline: z.coerce.date().optional(), eligibility: z.string().max(5000).optional(), applicationRequirements: z.string().max(5000).optional() });
const studentSchema = z.object({
  customerId: objectId.optional(), clientId: z.string().regex(/^\d{6}$/).optional(), firstName: z.string().min(1), lastName: z.string().min(1), fatherName: z.string().optional(), motherName: z.string().optional(), dateOfBirth: z.coerce.date().optional(), gender: z.string().optional(), maritalStatus: z.string().optional(), nationality: z.string().optional(), nationalId: z.string().optional(), passportNumber: z.string().optional(), passportIssueDate: z.coerce.date().optional(), passportExpiryDate: z.coerce.date().optional(), passportIssuePlace: z.string().optional(), mobile: z.string().optional(), whatsapp: z.string().optional(), email: z.string().email().optional(), presentAddress: z.string().optional(), permanentAddress: z.string().optional(), emergencyContactName: z.string().optional(), emergencyContactRelationship: z.string().optional(), emergencyContactPhone: z.string().optional(),
  educationHistory: z.array(z.object({ level: z.string(), institution: z.string().optional(), boardOrUniversity: z.string().optional(), year: z.string().optional(), result: z.string().optional() })).optional(), educationLevel: z.string().optional(), gradePointAverage: z.number().nonnegative().optional(), englishTest: z.string().optional(), englishScore: z.number().nonnegative().optional(), englishTestDate: z.coerce.date().optional(), studyGapYears: z.number().nonnegative().optional(), preferredCountries: z.array(objectId).optional(), preferredCountryTwo: objectId.optional(), preferredSubjects: z.array(z.string()).optional(), intendedProgram: z.string().optional(), preferredIntake: z.string().optional(), budgetAmount: z.number().nonnegative().optional(), budgetCurrency: z.string().length(3).optional(), fundingSource: z.string().optional(), workExperienceYears: z.number().nonnegative().optional(), currentOccupation: z.string().optional(), employer: z.string().optional(), referralSource: z.string().optional(), serviceRequired: z.array(z.string()).optional(), declarationAccepted: z.literal(true), declarationDate: z.coerce.date().optional(),
});
async function allocateClientId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate({ key: `student-client-${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  if (!counter || counter.value > 9999) throw new AppError('The yearly client ID limit has been reached.', 409);
  return `${String(year).slice(-2)}${String(counter.value).padStart(4, '0')}`;
}
async function ensureClientId(student: { clientId?: string | null; _id: unknown }) {
  if (student.clientId) return student.clientId;
  const clientId = await allocateClientId();
  await Student.updateOne({ _id: student._id, clientId: { $exists: false } }, { $set: { clientId } });
  return clientId;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const universitySlug = slugify;

interface ListQuery<T> extends PromiseLike<T[]> {
  sort(specification: Record<string, 1 | -1>): ListQuery<T>;
  skip(amount: number): ListQuery<T>;
  limit(amount: number): ListQuery<T>;
}

interface ListModel<T> {
  find(filter: Record<string, unknown>): ListQuery<T>;
  countDocuments(filter: Record<string, unknown>): PromiseLike<number>;
}

interface UniversityListRecord {
  _id: unknown;
  toObject(): Record<string, unknown>;
}

async function paginated<T>(model: ListModel<T>, filter: Record<string, unknown>, query: z.infer<typeof pageSchema>) {
  const skip = (query.page - 1) * query.pageSize;
  const [data, total] = await Promise.all([model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize), model.countDocuments(filter)]);
  return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
}

export function createEducationRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/public/universities', async (request, response, next) => {
    try {
      const query = pageSchema.parse(request.query);
      const filter: Record<string, unknown> = {
        isActive: true,
        publicationStatus: 'PUBLISHED',
      };
      if (query.search) {
        filter['$or'] = [
          { name: new RegExp(escapeRegex(query.search), 'i') },
          { description: new RegExp(escapeRegex(query.search), 'i') },
        ];
      }

      const skip = (query.page - 1) * query.pageSize;
      const [data, total] = await Promise.all([
        University.find(filter)
          .select(
            'name countryId website description logoUrl location media availablePrograms programDetails admissionRequirements tuitionFees scholarshipInformation publicProfile',
          )
          .populate('countryId', 'name code flagUrl')
          .sort({ name: 1 })
          .skip(skip)
          .limit(query.pageSize)
          .lean(),
        University.countDocuments(filter),
      ]);
      response.json({
        data,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/public/universities/:slug', async (request, response, next) => {
    try {
      const requestedSlug = z.string().min(1).max(150).parse(request.params['slug']);
      const records = await University.find({
        isActive: true,
        publicationStatus: 'PUBLISHED',
      })
        .select(
          'name countryId website description logoUrl location contact media availablePrograms programDetails admissionRequirements tuitionFees scholarshipInformation publicProfile',
        )
        .populate('countryId', 'name code flagUrl')
        .lean();
      const university = records.find((item) => universitySlug(item.name) === requestedSlug);
      if (!university) throw new AppError('Published university was not found.', 404);
      const programs = await Program.find({
        universityId: university._id,
        isActive: true,
      })
        .select('name level subject durationMonths intake tuitionAmount currency')
        .sort({ name: 1 })
        .lean();
      response.json({ ...university, programs });
    } catch (error) {
      next(error);
    }
  });

  router.use(requireAuth(config));

  router.get('/countries', requirePermission('country.read'), async (request, response, next) => {
    try {
      const query = pageSchema.parse(request.query);
      const filter = query.search ? { name: new RegExp(escapeRegex(query.search), 'i'), isActive: true } : { isActive: true };
      response.json(await paginated(Country, filter, query));
    } catch (error) { next(error); }
  });
  router.post('/countries', requirePermission('country.manage'), async (request, response, next) => {
    try { response.status(201).json(await Country.create(countrySchema.parse(request.body))); } catch (error) { next(error); }
  });
  router.patch('/countries/:id', requirePermission('country.manage'), async (request, response, next) => {
    try {
      const input = countrySchema.partial().parse(request.body);
      const country = await Country.findByIdAndUpdate(request.params['id'], input, { new: true, runValidators: true });
      if (!country) throw new AppError('Country was not found.', 404);
      response.json(country);
    } catch (error) { next(error); }
  });

  router.get('/universities', requirePermission('university.read'), async (request, response, next) => {
    try {
      const query = pageSchema.extend({ countryId: objectId.optional(), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional() }).parse(request.query);
      const filter: Record<string, unknown> = {};
      if (!query.status) filter['isActive'] = true;
      if (query.countryId) filter['countryId'] = query.countryId;
      if (query.status) filter['publicationStatus'] = query.status;
      if (query.search) filter['name'] = new RegExp(escapeRegex(query.search), 'i');
      const result = await paginated<UniversityListRecord>(University, filter, query);
      const universities = await Promise.all(result.data.map(async (university) => ({ ...university.toObject(), programs: await Program.countDocuments({ universityId: university._id, isActive: true }) })));
      response.json({ ...result, data: universities });
    } catch (error) { next(error); }
  });
  router.post('/universities', requirePermission('university.manage'), async (request, response, next) => {
    try { response.status(201).json(await University.create(universitySchema.parse(request.body))); } catch (error) { next(error); }
  });
  router.get('/universities/:id', requirePermission('university.read'), async (request, response, next) => {
    try {
      const university = await University.findById(request.params['id']).populate('countryId');
      if (!university) throw new AppError('University was not found.', 404);
      const [programs, applications] = await Promise.all([
        Program.find({ universityId: university._id, isActive: true }).sort({ name: 1 }),
        Application.find({ universityId: university._id }).sort({ createdAt: -1 }).limit(100),
      ]);
      response.json({ ...university.toObject(), programs, applications });
    } catch (error) { next(error); }
  });
  router.patch('/universities/:id', requirePermission('university.manage'), async (request, response, next) => {
    try {
      const input = universitySchema.partial().parse(request.body);
      const university = await University.findByIdAndUpdate(request.params['id'], input, { new: true, runValidators: true });
      if (!university) throw new AppError('University was not found.', 404);
      response.json(university);
    } catch (error) { next(error); }
  });

  router.get('/programs', requirePermission('program.read'), async (request, response, next) => {
    try {
      const query = pageSchema.extend({ universityId: objectId.optional(), level: programSchema.shape.level.optional() }).parse(request.query);
      const filter: Record<string, unknown> = { isActive: true };
      if (query.universityId) filter['universityId'] = query.universityId;
      if (query.level) filter['level'] = query.level;
      if (query.search) filter['name'] = new RegExp(escapeRegex(query.search), 'i');
      response.json(await paginated(Program, filter, query));
    } catch (error) { next(error); }
  });
  router.post('/programs', requirePermission('program.manage'), async (request, response, next) => {
    try { response.status(201).json(await Program.create(programSchema.parse(request.body))); } catch (error) { next(error); }
  });

  router.post('/intakes', requirePermission('program.manage'), async (request, response, next) => {
    try {
      const input = intakeSchema.parse(request.body);
      if (input.applicationDeadline >= input.startsOn) throw new AppError('Application deadline must be before the intake start date.', 400);
      response.status(201).json(await Intake.create(input));
    } catch (error) { next(error); }
  });
  router.get('/intakes', requirePermission('program.read'), async (request, response, next) => {
    try {
      const query = pageSchema.extend({ programId: objectId.optional() }).parse(request.query);
      response.json(await paginated(Intake, query.programId ? { programId: query.programId, isOpen: true } : { isOpen: true }, query));
    } catch (error) { next(error); }
  });

  router.get('/scholarships', requirePermission('scholarship.read'), async (request, response, next) => {
    try {
      const query = pageSchema.extend({ countryId: objectId.optional(), level: scholarshipSchema.shape.level.optional(), subject: z.string().optional() }).parse(request.query);
      const filter: Record<string, unknown> = { isActive: true };
      if (query.countryId) filter['countryId'] = query.countryId;
      if (query.level) filter['level'] = query.level;
      if (query.subject) filter['subject'] = new RegExp(escapeRegex(query.subject), 'i');
      if (query.search) filter['name'] = new RegExp(escapeRegex(query.search), 'i');
      response.json(await paginated(Scholarship, filter, query));
    } catch (error) { next(error); }
  });
  router.post('/scholarships', requirePermission('scholarship.manage'), async (request, response, next) => {
    try { response.status(201).json(await Scholarship.create(scholarshipSchema.parse(request.body))); } catch (error) { next(error); }
  });

  router.post('/students', requirePermission('student.create'), async (request, response, next) => {
    try {
      const input = studentSchema.parse(request.body);
      response.status(201).json(await Student.create({ ...input, clientId: await allocateClientId() }));
    } catch (error) { next(error); }
  });
  router.get('/students', requirePermission('student.read'), async (request, response, next) => {
    try {
      const query = pageSchema.parse(request.query);
      const students = await Student.find().populate('customerId', 'firstName lastName email').sort({ createdAt: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize);
      await Promise.all(students.map(async (student) => { if (!student.clientId) student.clientId = await ensureClientId(student); }));
      const total = await Student.countDocuments();
      response.json({ data: students, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
    } catch (error) { next(error); }
  });
  router.get('/students/:id', requirePermission('student.read'), async (request, response, next) => {
    try {
      const student = await Student.findById(request.params['id']).populate('preferredCountries');
      if (!student) throw new AppError('Student was not found.', 404);
      if (!student.clientId) student.clientId = await ensureClientId(student);
      response.json(student);
    } catch (error) { next(error); }
  });
  router.patch('/students/:id', requirePermission('student.update'), async (request, response, next) => {
    try {
      const input = studentSchema.partial().omit({ customerId: true, clientId: true }).parse(request.body);
      const student = await Student.findByIdAndUpdate(request.params['id'], input, { new: true, runValidators: true });
      if (!student) throw new AppError('Student was not found.', 404);
      response.json(student);
    } catch (error) { next(error); }
  });

  router.get('/students/:id/scholarship-matches', requirePermission('scholarship.read'), async (request, response, next) => {
    try {
      const student = await Student.findById(request.params['id']);
      if (!student) throw new AppError('Student was not found.', 404);
      const filter: Record<string, unknown> = { isActive: true, level: student.educationLevel };
      if (student.preferredSubjects?.length) filter['subject'] = { $in: student.preferredSubjects };
      if (student.preferredCountries?.length) filter['countryId'] = { $in: student.preferredCountries };
      response.json(await Scholarship.find(filter).sort({ deadline: 1 }));
    } catch (error) { next(error); }
  });

  return router;
}

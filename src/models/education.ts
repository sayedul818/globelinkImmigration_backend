import { Schema, model } from 'mongoose';

const countrySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    flagUrl: { type: String, trim: true },
    tuitionInformation: { type: String, trim: true },
    livingCosts: { type: String, trim: true },
    admissionRequirements: { type: String, trim: true },
    visaGuidance: { type: String, trim: true },
    popularCourses: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    website: { type: String, trim: true },
    description: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    location: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
    },
    contact: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    media: {
      campusImageUrl: { type: String, trim: true },
      brochureUrl: { type: String, trim: true },
    },
    availablePrograms: { type: String, trim: true },
    programDetails: [{
      name: { type: String, required: true, trim: true },
      level: { type: String, enum: ['FOUNDATION', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH'] },
      subject: { type: String, trim: true },
      durationMonths: { type: Number, min: 1 },
      intake: { type: String, trim: true },
      englishRequirements: { type: String, trim: true },
      admissionRequirements: { type: String, trim: true },
      tuitionFees: { type: String, trim: true },
      scholarshipInformation: { type: String, trim: true },
    }],
    admissionRequirements: { type: String, trim: true },
    tuitionFees: { type: String, trim: true },
    scholarshipInformation: { type: String, trim: true },
    publicProfile: {
      overview: { type: String, trim: true },
      costOfLiving: { type: String, trim: true },
      mapUrl: { type: String, trim: true },
      metrics: [{
        label: { type: String, trim: true },
        value: { type: String, trim: true },
        detail: { type: String, trim: true },
      }],
      highlights: [{
        title: { type: String, trim: true },
        description: { type: String, trim: true },
      }],
      faqs: [{
        question: { type: String, trim: true },
        answer: { type: String, trim: true },
      }],
    },
    publicationStatus: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

universitySchema.index({ name: 1, countryId: 1 }, { unique: true });

const programSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    name: { type: String, required: true, trim: true },
    level: { type: String, enum: ['FOUNDATION', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH'], required: true },
    subject: { type: String, required: true, trim: true },
    durationMonths: { type: Number, min: 1 },
    tuitionAmount: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    intake: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const intakeSchema = new Schema(
  {
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    name: { type: String, required: true, trim: true },
    startsOn: { type: Date, required: true },
    applicationDeadline: { type: Date, required: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const scholarshipSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country' },
    universityId: { type: Schema.Types.ObjectId, ref: 'University' },
    level: { type: String, enum: ['FOUNDATION', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH'], required: true },
    subject: { type: String, trim: true },
    fundingType: { type: String, enum: ['FULL', 'PARTIAL', 'FIXED_AMOUNT'], required: true },
    amount: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    deadline: { type: Date },
    eligibility: { type: String, trim: true },
    applicationRequirements: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const studentSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'CustomerProfile' },
    clientId: { type: String, trim: true, match: /^\d{6}$/ },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, trim: true },
    maritalStatus: { type: String, trim: true },
    nationality: { type: String, trim: true },
    nationalId: { type: String, trim: true },
    passportNumber: { type: String, trim: true },
    passportIssueDate: { type: Date },
    passportExpiryDate: { type: Date },
    passportIssuePlace: { type: String, trim: true },
    mobile: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    presentAddress: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactRelationship: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    educationHistory: [{
      level: { type: String, trim: true },
      institution: { type: String, trim: true },
      boardOrUniversity: { type: String, trim: true },
      year: { type: String, trim: true },
      result: { type: String, trim: true },
    }],
    educationLevel: { type: String, trim: true },
    gradePointAverage: { type: Number, min: 0 },
    englishTest: { type: String, trim: true },
    englishScore: { type: Number, min: 0 },
    englishTestDate: { type: Date },
    studyGapYears: { type: Number, min: 0 },
    preferredCountries: [{ type: Schema.Types.ObjectId, ref: 'Country' }],
    preferredSubjects: [{ type: String, trim: true }],
    preferredCountryTwo: { type: Schema.Types.ObjectId, ref: 'Country' },
    intendedProgram: { type: String, trim: true },
    preferredIntake: { type: String, trim: true },
    budgetAmount: { type: Number, min: 0 },
    budgetCurrency: { type: String, default: 'USD', uppercase: true },
    fundingSource: { type: String, trim: true },
    workExperienceYears: { type: Number, min: 0 },
    currentOccupation: { type: String, trim: true },
    employer: { type: String, trim: true },
    referralSource: { type: String, trim: true },
    serviceRequired: [{ type: String, trim: true }],
    declarationAccepted: { type: Boolean, required: true },
    declarationDate: { type: Date },
  },
  { timestamps: true, autoIndex: false },
);

export const Country = model('Country', countrySchema);
export const University = model('University', universitySchema);
export const Program = model('Program', programSchema);
export const Intake = model('Intake', intakeSchema);
export const Scholarship = model('Scholarship', scholarshipSchema);
export const Student = model('Student', studentSchema);

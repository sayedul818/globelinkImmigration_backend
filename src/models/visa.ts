import { Schema, model } from 'mongoose';

const visaCaseSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['DRAFT', 'DOCUMENTS_PENDING', 'READY_TO_FILE', 'SUBMITTED', 'BIOMETRICS_SCHEDULED', 'INTERVIEW_SCHEDULED', 'DECISION_PENDING', 'APPROVED', 'REFUSED', 'WITHDRAWN'], default: 'DRAFT' },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    statusHistory: { type: [{ status: String, changedBy: { type: Schema.Types.ObjectId, ref: 'User' }, note: String, changedAt: { type: Date, default: Date.now } }], default: [] },
  },
  { timestamps: true },
);

const visaRequirementSchema = new Schema(
  {
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    documentType: { type: String, required: true, trim: true },
    sourceUrl: { type: String, required: true, trim: true },
    isRequired: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

visaRequirementSchema.index({ countryId: 1, name: 1 }, { unique: true });

const visaChecklistSchema = new Schema(
  {
    visaCaseId: { type: Schema.Types.ObjectId, ref: 'VisaCase', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'VisaRequirement', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'StudentDocument' },
    status: { type: String, enum: ['PENDING', 'UPLOADED', 'VERIFIED', 'NOT_APPLICABLE'], default: 'PENDING' },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

visaChecklistSchema.index({ visaCaseId: 1, requirementId: 1 }, { unique: true });

const visaAppointmentSchema = new Schema(
  {
    visaCaseId: { type: Schema.Types.ObjectId, ref: 'VisaCase', required: true },
    type: { type: String, enum: ['BIOMETRICS', 'INTERVIEW', 'MEDICAL', 'PASSPORT_SUBMISSION'], required: true },
    scheduledAt: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'], default: 'SCHEDULED' },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export const VisaCase = model('VisaCase', visaCaseSchema);
export const VisaRequirement = model('VisaRequirement', visaRequirementSchema);
export const VisaChecklist = model('VisaChecklist', visaChecklistSchema);
export const VisaAppointment = model('VisaAppointment', visaAppointmentSchema);

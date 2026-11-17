import { Schema, model } from 'mongoose';

const applicationStatusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const applicationSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    intakeId: { type: Schema.Types.ObjectId, ref: 'Intake', required: true },
    status: { type: String, enum: ['DRAFT', 'READY_TO_SUBMIT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'], default: 'DRAFT' },
    submittedAt: { type: Date },
    deadline: { type: Date, required: true },
    notes: { type: String, trim: true },
    statusHistory: { type: [applicationStatusHistorySchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

applicationSchema.index({ studentId: 1, programId: 1, intakeId: 1 }, { unique: true });

const documentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: { type: String, enum: ['PASSPORT', 'TRANSCRIPT', 'CERTIFICATE', 'ENGLISH_TEST', 'STATEMENT_OF_PURPOSE', 'REFERENCE', 'OFFER_LETTER', 'FINANCIAL_PROOF', 'OTHER'], required: true },
    originalName: { type: String, required: true, trim: true },
    storageKey: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'], default: 'UPLOADED' },
    reviewNote: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

documentSchema.index({ studentId: 1, documentType: 1 });

export const Application = model('Application', applicationSchema);
export const StudentDocument = model('StudentDocument', documentSchema);

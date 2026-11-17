import { Schema, model } from 'mongoose';

const leadSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    source: { type: String, required: true, trim: true },
    /** Staff member who created the lead; empty for leads submitted from the public website. */
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'], default: 'NEW' },
    notes: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    convertedCustomerId: { type: Schema.Types.ObjectId, ref: 'CustomerProfile' },
    nextFollowUpAt: { type: Date },
    /** Details captured by the public "Book a consultation" form. */
    inquiry: {
      destination: { type: String, trim: true },
      studyLevel: { type: String, trim: true },
      currentEducation: { type: String, trim: true },
      intake: { type: String, trim: true },
      consultationMethod: { type: String, trim: true },
      preferredContact: { type: String, trim: true },
      preferredDate: { type: Date },
      message: { type: String, trim: true },
      consentAt: { type: Date },
      pagePath: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

leadSchema.index({ email: 1 });
leadSchema.index({ status: 1, assignedTo: 1 });

const customerProfileSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    assignedCounsellorId: { type: Schema.Types.ObjectId, ref: 'User' },
    lifecycle: { type: String, enum: ['PROSPECT', 'ACTIVE', 'COMPLETED', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true },
);

const consultationSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    counsellorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], default: 'SCHEDULED' },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

const followUpSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueAt: { type: Date, required: true },
    channel: { type: String, enum: ['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING'], required: true },
    note: { type: String, required: true, trim: true },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

const activitySchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    /** Staff member who acted; empty for automated or public-website events. */
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Lead = model('Lead', leadSchema);
export const CustomerProfile = model('CustomerProfile', customerProfileSchema);
export const Consultation = model('Consultation', consultationSchema);
export const FollowUp = model('FollowUp', followUpSchema);
export const CrmActivity = model('CrmActivity', activitySchema);

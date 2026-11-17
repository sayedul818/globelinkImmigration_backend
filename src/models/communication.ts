import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['APPLICATION_UPDATE', 'DOCUMENT_UPDATE', 'PAYMENT_UPDATE', 'VISA_UPDATE', 'SYSTEM'], required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

const supportTicketSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'WAITING_ON_STUDENT', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    messages: {
      type: [{
        authorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        authorStudentId: { type: Schema.Types.ObjectId, ref: 'Student' },
        body: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
  },
  { timestamps: true },
);

supportTicketSchema.index({ studentId: 1, status: 1, updatedAt: -1 });

export const Notification = model('Notification', notificationSchema);
export const SupportTicket = model('SupportTicket', supportTicketSchema);

import { Schema, model } from 'mongoose';

const invoiceLineSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitAmountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'CustomerProfile', required: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    currency: { type: String, required: true, uppercase: true, length: 3 },
    lines: { type: [invoiceLineSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    subtotalMinor: { type: Number, required: true, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    paidMinor: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'], default: 'DRAFT' },
    dueAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const paymentSchema = new Schema(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true, length: 3 },
    method: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_MONEY'], required: true },
    reference: { type: String, trim: true },
    receivedAt: { type: Date, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const refundSchema = new Schema(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED'], default: 'REQUESTED' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

const expenseSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true, length: 3 },
    category: { type: String, required: true, trim: true },
    incurredAt: { type: Date, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const commissionSchema = new Schema(
  {
    counsellorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, length: 3 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'PAID'], default: 'PENDING' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

export const Invoice = model('Invoice', invoiceSchema);
export const Payment = model('Payment', paymentSchema);
export const Refund = model('Refund', refundSchema);
export const Expense = model('Expense', expenseSchema);
export const Commission = model('Commission', commissionSchema);

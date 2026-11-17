import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { CustomerProfile } from '../models/crm.js';
import { Commission, Expense, Invoice, Payment, Refund } from '../models/finance.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const currency = z.string().regex(/^[A-Z]{3}$/, 'Currency must be a three-letter uppercase code.');
const lineSchema = z.object({ description: z.string().min(1), quantity: z.number().int().positive(), unitAmountMinor: z.number().int().nonnegative() });
const invoiceSchema = z.object({ customerId: objectId, invoiceNumber: z.string().min(1), currency, lines: z.array(lineSchema).min(1), dueAt: z.coerce.date() });
const paymentSchema = z.object({ invoiceId: objectId, amountMinor: z.number().int().positive(), currency, method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_MONEY']), reference: z.string().max(200).optional(), receivedAt: z.coerce.date() });
const refundSchema = z.object({ paymentId: objectId, amountMinor: z.number().int().positive(), reason: z.string().min(1).max(2000) });
const expenseSchema = z.object({ description: z.string().min(1), amountMinor: z.number().int().positive(), currency, category: z.string().min(1), incurredAt: z.coerce.date() });
const commissionSchema = z.object({ counsellorId: objectId, paymentId: objectId, amountMinor: z.number().int().nonnegative(), currency });

export function createFinanceRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));

  router.post('/invoices', requirePermission('invoice.create'), async (request, response, next) => {
    try {
      const input = invoiceSchema.parse(request.body);
      if (!(await CustomerProfile.exists({ _id: input.customerId }))) throw new AppError('Customer profile was not found.', 404);
      const subtotalMinor = input.lines.reduce((sum, line) => sum + line.quantity * line.unitAmountMinor, 0);
      response.status(201).json(await Invoice.create({ ...input, subtotalMinor, totalMinor: subtotalMinor, createdBy: request.auth!.userId }));
    } catch (error) { next(error); }
  });

  router.get('/invoices', requirePermission('invoice.read'), async (_request, response, next) => {
    try { response.json(await Invoice.find().populate('customerId').sort({ createdAt: -1 })); } catch (error) { next(error); }
  });

  router.patch('/invoices/:id/issue', requirePermission('invoice.create'), async (request, response, next) => {
    try {
      const invoice = await Invoice.findByIdAndUpdate(request.params['id'], { status: 'ISSUED' }, { new: true });
      if (!invoice) throw new AppError('Invoice was not found.', 404);
      response.json(invoice);
    } catch (error) { next(error); }
  });

  router.post('/payments', requirePermission('payment.create'), async (request, response, next) => {
    try {
      const input = paymentSchema.parse(request.body);
      const invoice = await Invoice.findById(input.invoiceId);
      if (!invoice || invoice.status === 'VOID') throw new AppError('Invoice was not found or is void.', 404);
      if (invoice.currency !== input.currency) throw new AppError('Payment currency must match the invoice currency.', 400);
      if (invoice.paidMinor + input.amountMinor > invoice.totalMinor) throw new AppError('Payment exceeds the invoice outstanding balance.', 400);
      const payment = await Payment.create({ ...input, recordedBy: request.auth!.userId });
      invoice.paidMinor += input.amountMinor;
      invoice.status = invoice.paidMinor === invoice.totalMinor ? 'PAID' : 'PARTIALLY_PAID';
      await invoice.save();
      response.status(201).json({ payment, receipt: { receiptNumber: `R-${payment._id}`, amountMinor: payment.amountMinor, currency: payment.currency, receivedAt: payment.receivedAt } });
    } catch (error) { next(error); }
  });

  router.get('/invoices/:id/payments', requirePermission('payment.read'), async (request, response, next) => {
    try { response.json(await Payment.find({ invoiceId: request.params['id'] }).sort({ receivedAt: -1 })); } catch (error) { next(error); }
  });

  router.post('/refunds', requirePermission('payment.refund'), async (request, response, next) => {
    try {
      const input = refundSchema.parse(request.body);
      const payment = await Payment.findById(input.paymentId);
      if (!payment || input.amountMinor > payment.amountMinor) throw new AppError('Refund exceeds the payment amount or payment was not found.', 400);
      response.status(201).json(await Refund.create(input));
    } catch (error) { next(error); }
  });

  router.patch('/refunds/:id/approve', requirePermission('payment.refund'), async (request, response, next) => {
    try {
      const refund = await Refund.findOneAndUpdate({ _id: request.params['id'], status: 'REQUESTED' }, { status: 'APPROVED' }, { new: true });
      if (!refund) throw new AppError('Only requested refunds can be approved.', 400);
      response.json(refund);
    } catch (error) { next(error); }
  });

  router.patch('/refunds/:id/process', requirePermission('payment.refund'), async (request, response, next) => {
    try {
      const refund = await Refund.findOneAndUpdate({ _id: request.params['id'], status: 'APPROVED' }, { status: 'PROCESSED', processedBy: request.auth!.userId, processedAt: new Date() }, { new: true });
      if (!refund) throw new AppError('Only approved refunds can be processed.', 400);
      response.json(refund);
    } catch (error) { next(error); }
  });

  router.post('/expenses', requirePermission('expense.create'), async (request, response, next) => {
    try { response.status(201).json(await Expense.create({ ...expenseSchema.parse(request.body), recordedBy: request.auth!.userId })); } catch (error) { next(error); }
  });

  router.get('/expenses', requirePermission('expense.read'), async (_request, response, next) => {
    try { response.json(await Expense.find().sort({ incurredAt: -1 })); } catch (error) { next(error); }
  });

  router.post('/commissions', requirePermission('commission.manage'), async (request, response, next) => {
    try {
      const input = commissionSchema.parse(request.body);
      if (!(await Payment.exists({ _id: input.paymentId, currency: input.currency }))) throw new AppError('Payment was not found or currency does not match.', 400);
      response.status(201).json(await Commission.create(input));
    } catch (error) { next(error); }
  });

  router.patch('/commissions/:id/approve', requirePermission('commission.manage'), async (request, response, next) => {
    try {
      const commission = await Commission.findOneAndUpdate({ _id: request.params['id'], status: 'PENDING' }, { status: 'APPROVED', approvedBy: request.auth!.userId }, { new: true });
      if (!commission) throw new AppError('Only pending commissions can be approved.', 400);
      response.json(commission);
    } catch (error) { next(error); }
  });

  return router;
}

import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { requireAuth, requirePermission } from '../auth/middleware.js';
import { AppError } from '../middleware/error-handler.js';
import { Application, StudentDocument } from '../models/application.js';
import { CustomerProfile } from '../models/crm.js';
import { Expense, Invoice, Payment } from '../models/finance.js';
import { Student } from '../models/education.js';
import { Notification, SupportTicket } from '../models/communication.js';
import { User } from '../models/user.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const ticketSchema = z.object({ subject: z.string().min(1).max(200), description: z.string().min(1).max(5000), priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL') });
const ticketMessageSchema = z.object({ body: z.string().min(1).max(5000) });
const ticketUpdateSchema = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_STUDENT', 'RESOLVED', 'CLOSED']).optional(), priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(), assignedTo: objectId.optional() });
const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });

async function studentForUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User account was not found.', 404);
  const customer = await CustomerProfile.findOne({ email: user.email });
  if (!customer) throw new AppError('Student profile was not found.', 404);
  const student = await Student.findOne({ customerId: customer._id });
  if (!student) throw new AppError('Student profile was not found.', 404);
  return student;
}

export function createPortalRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/me', requirePermission('portal.self.read'), async (request, response, next) => {
    try {
      const student = await studentForUser(request.auth!.userId);
      const customer = await CustomerProfile.findById(student.customerId);
      response.json({ student, customer });
    } catch (error) { next(error); }
  });

  router.get('/dashboard', requirePermission('portal.self.read'), async (request, response, next) => {
    try {
      const student = await studentForUser(request.auth!.userId);
      const [applications, documents, invoices, payments, notifications] = await Promise.all([
        Application.find({ studentId: student._id }).select('universityId programId status deadline').sort({ deadline: 1 }),
        StudentDocument.find({ studentId: student._id }).select('documentType originalName status createdAt').sort({ createdAt: -1 }),
        Invoice.find({ customerId: student.customerId }).select('invoiceNumber currency totalMinor paidMinor status dueAt').sort({ dueAt: 1 }),
        Invoice.find({ customerId: student.customerId }).distinct('_id').then((ids) => Payment.find({ invoiceId: { $in: ids } }).sort({ receivedAt: -1 }).limit(10)),
        Notification.find({ userId: request.auth!.userId }).sort({ createdAt: -1 }).limit(10),
      ]);
      response.json({ student, applications, documents, invoices, payments, notifications });
    } catch (error) { next(error); }
  });

  router.get('/notifications', requirePermission('portal.self.read'), async (request, response, next) => {
    try {
      const query = pageSchema.parse(request.query);
      const filter = { userId: request.auth!.userId };
      const skip = (query.page - 1) * query.pageSize;
      const [data, total] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize),
        Notification.countDocuments(filter),
      ]);
      response.json({ data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
    } catch (error) { next(error); }
  });

  router.patch('/notifications/:id/read', requirePermission('portal.self.read'), async (request, response, next) => {
    try {
      const notification = await Notification.findOneAndUpdate({ _id: request.params['id'], userId: request.auth!.userId }, { readAt: new Date() }, { new: true });
      if (!notification) throw new AppError('Notification was not found.', 404);
      response.json(notification);
    } catch (error) { next(error); }
  });

  router.get('/tickets', requirePermission('portal.self.read'), async (request, response, next) => {
    try {
      const student = await studentForUser(request.auth!.userId);
      response.json(await SupportTicket.find({ studentId: student._id }).sort({ updatedAt: -1 }));
    } catch (error) { next(error); }
  });

  router.post('/tickets', requirePermission('portal.ticket.create'), async (request, response, next) => {
    try {
      const student = await studentForUser(request.auth!.userId);
      const input = ticketSchema.parse(request.body);
      response.status(201).json(await SupportTicket.create({ ...input, studentId: student._id }));
    } catch (error) { next(error); }
  });

  router.post('/tickets/:id/messages', requirePermission('portal.ticket.create'), async (request, response, next) => {
    try {
      const student = await studentForUser(request.auth!.userId);
      const input = ticketMessageSchema.parse(request.body);
      const ticket = await SupportTicket.findOne({ _id: request.params['id'], studentId: student._id });
      if (!ticket) throw new AppError('Support ticket was not found.', 404);
      ticket.messages.push({ authorStudentId: student._id, body: input.body, createdAt: new Date() });
      if (ticket.status === 'WAITING_ON_STUDENT') ticket.status = 'IN_PROGRESS';
      await ticket.save();
      response.json(ticket);
    } catch (error) { next(error); }
  });

  router.get('/staff/tickets', requirePermission('support.ticket.manage'), async (_request, response, next) => {
    try { response.json(await SupportTicket.find().populate('studentId assignedTo').sort({ updatedAt: -1 })); } catch (error) { next(error); }
  });

  router.patch('/staff/tickets/:id', requirePermission('support.ticket.manage'), async (request, response, next) => {
    try {
      const input = ticketUpdateSchema.parse(request.body);
      const ticket = await SupportTicket.findByIdAndUpdate(request.params['id'], input, { new: true, runValidators: true });
      if (!ticket) throw new AppError('Support ticket was not found.', 404);
      response.json(ticket);
    } catch (error) { next(error); }
  });

  router.post('/staff/tickets/:id/messages', requirePermission('support.ticket.manage'), async (request, response, next) => {
    try {
      const input = ticketMessageSchema.parse(request.body);
      const ticket = await SupportTicket.findById(request.params['id']);
      if (!ticket) throw new AppError('Support ticket was not found.', 404);
      ticket.messages.push({ authorUserId: request.auth!.userId, body: input.body, createdAt: new Date() });
      await ticket.save();
      response.json(ticket);
    } catch (error) { next(error); }
  });

  return router;
}

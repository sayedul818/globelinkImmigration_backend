import type { RequestHandler } from 'express';
import { AppError } from '../middleware/error-handler.js';
import { verifyAccessToken } from './security.js';
import type { AppConfig } from '../config/env.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; email: string; role: string };
    }
  }
}

export function requireAuth(config: AppConfig): RequestHandler {
  return (request, _response, next) => {
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) return next(new AppError('Authentication is required.', 401));
    try {
      const claims = verifyAccessToken(header.slice(7), config);
      request.auth = { userId: claims.sub, email: claims.email, role: claims.role };
      next();
    } catch {
      next(new AppError('The access token is invalid or expired.', 401));
    }
  };
}

export function requireRoles(...roles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) return next(new AppError('You do not have permission to perform this action.', 403));
    next();
  };
}

export function requirePermission(permission: string): RequestHandler {
  return (request, _response, next) => {
    const permissions = rolePermissions[request.auth?.role ?? ''] ?? [];
    if (!permissions.includes(permission)) return next(new AppError('You do not have permission to perform this action.', 403));
    next();
  };
}

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: ['employee.read', 'employee.create', 'employee.update', 'employee.deactivate', 'role.manage', 'lead.read', 'lead.create', 'lead.update', 'lead.assign', 'lead.convert', 'consultation.manage', 'followup.manage', 'country.read', 'country.manage', 'university.read', 'university.manage', 'program.read', 'program.manage', 'scholarship.read', 'scholarship.manage', 'student.read', 'student.create', 'student.update', 'application.read', 'application.create', 'application.update', 'document.read', 'document.upload', 'document.review', 'visa.read', 'visa.create', 'visa.assign', 'visa.update', 'visa.requirement.manage', 'invoice.create', 'invoice.read', 'payment.create', 'payment.read', 'payment.refund', 'expense.create', 'expense.read', 'commission.manage', 'portal.self.read', 'portal.ticket.create', 'support.ticket.manage', 'content.manage', 'media.upload', 'report.view', 'report.export'],
  CEO: ['employee.read', 'lead.read'],
  MANAGING_DIRECTOR: ['employee.read', 'lead.read'],
  EDUCATION_MANAGER: ['lead.read', 'lead.create', 'lead.update', 'lead.assign', 'lead.convert', 'consultation.manage', 'followup.manage', 'country.read', 'country.manage', 'university.read', 'university.manage', 'program.read', 'program.manage', 'scholarship.read', 'scholarship.manage', 'student.read', 'student.create', 'student.update', 'application.read', 'application.create', 'application.update', 'document.read', 'document.upload', 'document.review', 'visa.read', 'visa.create', 'visa.assign', 'visa.update', 'visa.requirement.manage', 'invoice.create', 'invoice.read', 'payment.create', 'payment.read', 'expense.read', 'support.ticket.manage', 'content.manage', 'media.upload', 'report.view', 'report.export'],
  SENIOR_EDUCATION_COUNSELLOR: ['country.read', 'university.read', 'program.read', 'scholarship.read', 'student.read', 'student.create', 'student.update', 'application.read', 'application.create', 'application.update', 'document.read', 'document.upload', 'document.review', 'visa.read', 'visa.create', 'visa.update'],
  EDUCATION_COUNSELLOR: ['country.read', 'university.read', 'program.read', 'scholarship.read', 'student.read', 'student.create', 'student.update', 'application.read', 'application.create', 'application.update', 'document.read', 'document.upload', 'visa.read', 'visa.create', 'visa.update', 'support.ticket.manage', 'report.view'],
  VISA_OFFICER: ['visa.read', 'visa.update', 'visa.assign'],
  CUSTOMER: ['portal.self.read', 'portal.ticket.create'],
  ACCOUNTANT: [],
  MARKETING_MANAGER: [],
  SUPPORT_AGENT: [],
};

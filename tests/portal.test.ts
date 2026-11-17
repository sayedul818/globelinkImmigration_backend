import { describe, expect, it } from 'vitest';
import { Notification, SupportTicket } from '../src/models/communication.js';

describe('portal communication models', () => {
  it('requires notification ownership and message fields', () => {
    const notification = new Notification({});
    const errors = notification.validateSync()?.errors;

    expect(errors?.['userId']).toBeDefined();
    expect(errors?.['title']).toBeDefined();
    expect(errors?.['message']).toBeDefined();
  });

  it('defaults support tickets to open and normal priority', () => {
    const ticket = new SupportTicket({
      studentId: '507f1f77bcf86cd799439011',
      subject: 'Application question',
      description: 'Please clarify my application deadline.',
    });

    expect(ticket.status).toBe('OPEN');
    expect(ticket.priority).toBe('NORMAL');
    expect(ticket.messages).toEqual([]);
  });
});

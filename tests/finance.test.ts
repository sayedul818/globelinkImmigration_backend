import { describe, expect, it } from 'vitest';
import { Commission, Expense, Invoice, Payment, Refund } from '../src/models/finance.js';

describe('finance models', () => {
  it('requires invoice customer, lines, totals, and due date', () => {
    const invoice = new Invoice({});
    const errors = invoice.validateSync()?.errors;

    expect(errors?.['customerId']).toBeDefined();
    expect(errors?.['lines']).toBeDefined();
    expect(errors?.['totalMinor']).toBeDefined();
    expect(errors?.['dueAt']).toBeDefined();
  });

  it('stores monetary values as integer minor units', () => {
    const payment = new Payment({ amountMinor: 1250 });
    const invalidPayment = new Payment({ amountMinor: 0 });

    expect(payment.amountMinor).toBe(1250);
    expect(invalidPayment.validateSync()?.errors['amountMinor']).toBeDefined();
  });

  it('requires payment linkage for refunds and commissions', () => {
    expect(new Refund({}).validateSync()?.errors['paymentId']).toBeDefined();
    expect(new Commission({}).validateSync()?.errors['paymentId']).toBeDefined();
  });

  it('requires expense details', () => {
    const expense = new Expense({});
    const errors = expense.validateSync()?.errors;

    expect(errors?.['description']).toBeDefined();
    expect(errors?.['amountMinor']).toBeDefined();
    expect(errors?.['category']).toBeDefined();
  });
});

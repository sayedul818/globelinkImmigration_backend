import { describe, expect, it } from 'vitest';
import { Lead } from '../src/models/crm.js';

describe('CRM models', () => {
  it('requires the core lead fields', () => {
    const lead = new Lead({ firstName: 'Sayedul' });
    const validation = lead.validateSync();

    expect(validation?.errors['lastName']).toBeDefined();
    expect(validation?.errors['email']).toBeDefined();
    expect(validation?.errors['source']).toBeDefined();
  });

  it('defaults new leads to NEW status', () => {
    const lead = new Lead({
      firstName: 'Sayedul',
      lastName: 'Islam',
      email: 'sayedul@example.com',
      source: 'WEBSITE',
      createdBy: '507f1f77bcf86cd799439011',
    });

    expect(lead.status).toBe('NEW');
  });
});

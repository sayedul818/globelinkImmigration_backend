import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { consultationRequestSchema } from '../src/crm/routes.js';

const valid = {
  firstName: 'Amina',
  lastName: 'Rahman',
  email: 'amina@example.com',
  phone: '+880 1700 000000',
  destination: 'Canada',
  preferredContact: 'WHATSAPP',
  consent: true,
};

describe('public consultation requests', () => {
  it('accepts a complete request', () => {
    expect(consultationRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('requires consent', () => {
    expect(consultationRequestSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it('rejects malformed email and phone numbers', () => {
    expect(consultationRequestSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(consultationRequestSchema.safeParse({ ...valid, phone: '<script>' }).success).toBe(false);
  });

  it('limits message length', () => {
    expect(consultationRequestSchema.safeParse({ ...valid, message: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('returns a validation error for incomplete submissions without touching the database', async () => {
    const response = await request(createApp())
      .post('/api/v1/crm/public/consultations')
      .send({ firstName: 'Amina' });
    expect(response.status).toBe(400);
  });

  it('silently accepts but discards submissions that fill the honeypot', async () => {
    const response = await request(createApp())
      .post('/api/v1/crm/public/consultations')
      .send({ ...valid, website: 'https://spam.example' });
    expect(response.status).toBe(202);
    expect(response.body.reference).toBeUndefined();
  });

  it('rate-limits repeated submissions from one address', async () => {
    const app = createApp();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await request(app).post('/api/v1/crm/public/consultations').send({ firstName: 'x' });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5).every((status) => status === 400)).toBe(true);
    expect(statuses.slice(5).every((status) => status === 429)).toBe(true);
  });

  it('keeps the staff lead list private', async () => {
    const response = await request(createApp()).get('/api/v1/crm/leads?source=website');
    expect(response.status).toBe(401);
  });
});

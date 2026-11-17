import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Types } from 'mongoose';
import { DestinationContent } from '../src/models/destination-content.js';

describe('study destination page content', () => {
  it('requires editable hero copy, topics and an author', () => {
    const errors = new DestinationContent({}).validateSync()?.errors;

    expect(errors?.['slug']).toBeDefined();
    expect(errors?.['heroTitle']).toBeDefined();
    expect(errors?.['heroDescription']).toBeDefined();
    expect(errors?.['topics']).toBeDefined();
    expect(errors?.['updatedBy']).toBeDefined();
  });

  it('accepts long requirement lists within the admin editor limits', () => {
    const guide = new DestinationContent({
      slug: 'canada',
      heroTitle: 'Study in Canada',
      heroDescription: 'Explore study options.',
      updatedBy: new Types.ObjectId(),
      topics: [{
        title: 'Admission requirements',
        summary: 'Requirements depend on the institution.',
        visualTitle: 'Academic pathways',
        points: Array.from({ length: 25 }, (_, index) => `Requirement ${index + 1}: ${'x'.repeat(350)}`),
      }],
    });

    expect(guide.validateSync()).toBeUndefined();
  });

  it('rejects points exceeding the configured admin editor limits', () => {
    const guide = new DestinationContent({
      slug: 'canada',
      heroTitle: 'Study in Canada',
      heroDescription: 'Explore study options.',
      updatedBy: new Types.ObjectId(),
      topics: [{
        title: 'Admission requirements',
        summary: 'Requirements depend on the institution.',
        visualTitle: 'Academic pathways',
        points: Array.from({ length: 51 }, (_, index) => `Requirement ${index + 1}`),
      }],
    });

    const errors = guide.validateSync()?.errors ?? {};
    expect(Object.keys(errors).some((path) => path.includes('points'))).toBe(true);
  });

  it('does not expose destination content administration without authentication', async () => {
    const response = await request(createApp()).get('/api/v1/destination-content/admin');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('REQUEST_ERROR');
  });
});

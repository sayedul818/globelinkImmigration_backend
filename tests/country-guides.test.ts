import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { CountryGuide } from '../src/models/country-guide.js';

describe('country processing guides', () => {
  it('defaults new guides to draft with an empty step list', () => {
    const guide = new CountryGuide({});

    expect(guide.status).toBe('DRAFT');
    expect(guide.steps).toEqual([]);
  });

  it('requires a country, category, slug, title, and author', () => {
    const errors = new CountryGuide({}).validateSync()?.errors;

    expect(errors?.['countryId']).toBeDefined();
    expect(errors?.['category']).toBeDefined();
    expect(errors?.['slug']).toBeDefined();
    expect(errors?.['title']).toBeDefined();
    expect(errors?.['updatedBy']).toBeDefined();
  });

  it('does not expose guide administration without authentication', async () => {
    const response = await request(createApp()).get('/api/v1/country-guides/admin');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('REQUEST_ERROR');
  });
});

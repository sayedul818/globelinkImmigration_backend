import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { Country, Program, Student, University } from '../src/models/education.js';

describe('education models', () => {
  it('requires country identity fields', () => {
    const country = new Country({});
    const validation = country.validateSync();

    expect(validation?.errors['name']).toBeDefined();
    expect(validation?.errors['code']).toBeDefined();
  });

  it('requires direct student identity fields', () => {
    const student = new Student({});
    const errors = student.validateSync()?.errors;
    expect(errors?.['firstName']).toBeDefined();
    expect(errors?.['lastName']).toBeDefined();
    expect(errors?.['declarationAccepted']).toBeDefined();
  });

  it('requires a program university link and academic fields', () => {
    const program = new Program({});
    const errors = program.validateSync()?.errors;

    expect(errors?.['universityId']).toBeDefined();
    expect(errors?.['name']).toBeDefined();
    expect(errors?.['level']).toBeDefined();
    expect(errors?.['subject']).toBeDefined();
  });

  it('accepts structured public university page content', () => {
    const university = new University({
      name: 'Example University',
      countryId: new Types.ObjectId(),
      publicProfile: {
        overview: 'A university overview.',
        costOfLiving: 'Contact the institution for current figures.',
        mapUrl: 'https://maps.google.com/?q=Example',
        metrics: [{ label: 'Programs', value: '40', detail: 'Available programs' }],
        highlights: [{ title: 'Research', description: 'Research opportunities.' }],
        faqs: [{ question: 'How do I apply?', answer: 'Submit an application online.' }],
      },
    });

    expect(university.validateSync()).toBeUndefined();
  });
});

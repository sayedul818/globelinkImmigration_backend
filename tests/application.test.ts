import { describe, expect, it } from 'vitest';
import { Application, StudentDocument } from '../src/models/application.js';

describe('application and document models', () => {
  it('requires the application references and deadline', () => {
    const application = new Application({});
    const errors = application.validateSync()?.errors;

    expect(errors?.['studentId']).toBeDefined();
    expect(errors?.['universityId']).toBeDefined();
    expect(errors?.['programId']).toBeDefined();
    expect(errors?.['intakeId']).toBeDefined();
    expect(errors?.['deadline']).toBeDefined();
  });

  it('defaults applications to draft', () => {
    const application = new Application({});

    expect(application.status).toBe('DRAFT');
    expect(application.statusHistory).toEqual([]);
  });

  it('limits document records to positive file sizes', () => {
    const document = new StudentDocument({ sizeBytes: 0 });

    expect(document.validateSync()?.errors['sizeBytes']).toBeDefined();
  });
});

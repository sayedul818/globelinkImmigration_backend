import { describe, expect, it } from 'vitest';
import { VisaAppointment, VisaCase, VisaRequirement } from '../src/models/visa.js';

describe('visa models', () => {
  it('requires core visa case references', () => {
    const visaCase = new VisaCase({});
    const errors = visaCase.validateSync()?.errors;

    expect(errors?.['studentId']).toBeDefined();
    expect(errors?.['countryId']).toBeDefined();
    expect(errors?.['applicationId']).toBeDefined();
  });

  it('defaults visa cases to draft', () => {
    const visaCase = new VisaCase({});

    expect(visaCase.status).toBe('DRAFT');
    expect(visaCase.statusHistory).toEqual([]);
  });

  it('requires an official source URL for requirements', () => {
    const requirement = new VisaRequirement({});

    expect(requirement.validateSync()?.errors['sourceUrl']).toBeDefined();
  });

  it('requires appointment scheduling details', () => {
    const appointment = new VisaAppointment({});
    const errors = appointment.validateSync()?.errors;

    expect(errors?.['type']).toBeDefined();
    expect(errors?.['scheduledAt']).toBeDefined();
    expect(errors?.['location']).toBeDefined();
  });
});

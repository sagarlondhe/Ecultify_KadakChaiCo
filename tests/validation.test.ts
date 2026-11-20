import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  normalizeIndianPhone,
  normalizeContact,
  submissionSchema,
} from '../lib/validation.ts';

describe('Contact Normalization and Validation', () => {
  describe('normalizeEmail', () => {
    it('normalizes valid lowercase email', () => {
      assert.equal(normalizeEmail('aarav@example.com'), 'aarav@example.com');
    });

    it('trims whitespace and converts uppercase to lowercase', () => {
      assert.equal(
        normalizeEmail('   Pooja.Sharma@Domain.COM  '),
        'pooja.sharma@domain.com'
      );
    });

    it('returns null for invalid emails', () => {
      assert.equal(normalizeEmail(''), null);
      assert.equal(normalizeEmail('invalid-email'), null);
      assert.equal(normalizeEmail('user@'), null);
      assert.equal(normalizeEmail('@domain.com'), null);
      assert.equal(normalizeEmail('user@domain'), null);
      assert.equal(normalizeEmail('user @domain.com'), null);
    });
  });

  describe('normalizeIndianPhone', () => {
    it('accepts clean 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
      assert.equal(normalizeIndianPhone('9876543210'), '9876543210');
      assert.equal(normalizeIndianPhone('8765432109'), '8765432109');
      assert.equal(normalizeIndianPhone('7654321098'), '7654321098');
      assert.equal(normalizeIndianPhone('6543210987'), '6543210987');
    });

    it('normalizes +91 country code prefix with spaces and dashes', () => {
      assert.equal(normalizeIndianPhone('+91 98765 43210'), '9876543210');
      assert.equal(normalizeIndianPhone('+919876543210'), '9876543210');
      assert.equal(normalizeIndianPhone('+91-98765-43210'), '9876543210');
      assert.equal(normalizeIndianPhone('919876543210'), '9876543210');
    });

    it('normalizes leading 0 trunk prefix', () => {
      assert.equal(normalizeIndianPhone('09876543210'), '9876543210');
      assert.equal(normalizeIndianPhone('(0) 98765 43210'), '9876543210');
    });

    it('rejects numbers starting with invalid digits (1-5)', () => {
      assert.equal(normalizeIndianPhone('5876543210'), null);
      assert.equal(normalizeIndianPhone('1876543210'), null);
      assert.equal(normalizeIndianPhone('01876543210'), null);
      assert.equal(normalizeIndianPhone('+91 5876543210'), null);
    });

    it('rejects numbers with incorrect lengths', () => {
      assert.equal(normalizeIndianPhone('987654321'), null); // 9 digits
      assert.equal(normalizeIndianPhone('98765432100'), null); // 11 digits without 0
      assert.equal(normalizeIndianPhone('+91987654321'), null);
      assert.equal(normalizeIndianPhone(''), null);
    });
  });

  describe('normalizeContact', () => {
    it('detects and normalizes email contacts', () => {
      const result = normalizeContact('  USER@KADAKCHAI.CO  ');
      assert.deepEqual(result, {
        type: 'email',
        normalized: 'user@kadakchai.co',
      });
    });

    it('detects and normalizes phone contacts', () => {
      const result = normalizeContact('+91 98123 45678');
      assert.deepEqual(result, {
        type: 'phone',
        normalized: '9812345678',
      });
    });

    it('returns null for unparseable contacts', () => {
      assert.equal(normalizeContact('not-an-email-or-phone'), null);
      assert.equal(normalizeContact('12345'), null);
      assert.equal(normalizeContact(''), null);
    });
  });
});

describe('submissionSchema Zod Validation', () => {
  const validSubmission = {
    name: 'Aarav Sharma',
    city: 'Mumbai',
    contact: '+91 98765 43210',
    story:
      'Every evening at 5 PM, our office team pauses everything for cutting chai and samosas.',
    consent: true,
  };

  it('validates a complete valid payload with phone', () => {
    const result = submissionSchema.safeParse(validSubmission);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.name, 'Aarav Sharma');
      assert.equal(result.data.city, 'Mumbai');
      assert.equal(result.data.contact, '9876543210'); // Normalized 10 digits
      assert.equal(result.data.consent, true);
    }
  });

  it('validates a complete valid payload with email', () => {
    const payload = {
      ...validSubmission,
      contact: '  Aarav.Sharma@EXAMPLE.COM  ',
    };
    const result = submissionSchema.safeParse(payload);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.contact, 'aarav.sharma@example.com'); // Normalized lowercase
    }
  });

  it('rejects payload when name is too short or too long', () => {
    const shortName = submissionSchema.safeParse({
      ...validSubmission,
      name: 'A',
    });
    assert.equal(shortName.success, false);

    const longName = submissionSchema.safeParse({
      ...validSubmission,
      name: 'A'.repeat(61),
    });
    assert.equal(longName.success, false);
  });

  it('rejects payload when city is too short or too long', () => {
    const shortCity = submissionSchema.safeParse({
      ...validSubmission,
      city: 'M',
    });
    assert.equal(shortCity.success, false);

    const longCity = submissionSchema.safeParse({
      ...validSubmission,
      city: 'M'.repeat(51),
    });
    assert.equal(longCity.success, false);
  });

  it('rejects payload when story is under 10 or over 300 characters', () => {
    const shortStory = submissionSchema.safeParse({
      ...validSubmission,
      story: 'Too short',
    });
    assert.equal(shortStory.success, false);

    const longStory = submissionSchema.safeParse({
      ...validSubmission,
      story: 'Chai '.repeat(70), // 350 chars
    });
    assert.equal(longStory.success, false);
  });

  it('rejects payload without mandatory consent', () => {
    const noConsent = submissionSchema.safeParse({
      ...validSubmission,
      consent: false,
    });
    assert.equal(noConsent.success, false);

    const missingConsent = submissionSchema.safeParse({
      name: validSubmission.name,
      city: validSubmission.city,
      contact: validSubmission.contact,
      story: validSubmission.story,
    });
    assert.equal(missingConsent.success, false);
  });

  it('rejects invalid contact format', () => {
    const invalidContact = submissionSchema.safeParse({
      ...validSubmission,
      contact: 'invalid-contact-info',
    });
    assert.equal(invalidContact.success, false);
  });
});

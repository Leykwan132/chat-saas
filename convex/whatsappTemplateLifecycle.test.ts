import { describe, expect, test } from 'vitest';
import {
  canApplyMetaTemplateStatus,
  mapMetaTemplateEvent,
  normalizeMetaTemplateId,
  normalizeWhatsAppTemplateCategory,
  normalizeWhatsAppTemplateLanguage,
} from './whatsappTemplateLifecycle';

describe('WhatsApp template lifecycle', () => {
  test.each([
    ['APPROVED', 'approved'],
    ['REINSTATED', 'approved'],
    ['PENDING', 'in_review'],
    ['IN_APPEAL', 'in_review'],
    ['REJECTED', 'failed'],
    ['PENDING_DELETION', 'failed'],
    ['DELETED', 'failed'],
    ['DISABLED', 'failed'],
    ['FLAGGED', 'failed'],
  ] as const)('maps %s to %s', (event, status) => {
    expect(mapMetaTemplateEvent(event)?.status).toBe(status);
  });

  test('preserves a supplied terminal reason', () => {
    expect(mapMetaTemplateEvent('REJECTED', 'Policy violation')).toEqual({
      status: 'failed',
      error: 'Policy violation',
    });
  });

  test('ignores unknown Meta events', () => {
    expect(mapMetaTemplateEvent('UNKNOWN_EVENT')).toBeNull();
  });

  test('normalizes language separators and casing', () => {
    expect(normalizeWhatsAppTemplateLanguage(' EN-us ')).toBe('en_us');
  });

  test('normalizes numeric and string Meta template IDs', () => {
    expect(normalizeMetaTemplateId(1351522527069032)).toBe('1351522527069032');
    expect(normalizeMetaTemplateId(' 1351522527069032 ')).toBe('1351522527069032');
    expect(normalizeMetaTemplateId(undefined)).toBeUndefined();
  });

  test('narrows supported Meta template categories', () => {
    expect(normalizeWhatsAppTemplateCategory(' marketing ')).toBe('MARKETING');
    expect(normalizeWhatsAppTemplateCategory('UTILITY')).toBe('UTILITY');
    expect(normalizeWhatsAppTemplateCategory('AUTHENTICATION')).toBeUndefined();
  });

  test('does not downgrade terminal states to in review', () => {
    expect(canApplyMetaTemplateStatus('approved', 'in_review')).toBe(false);
    expect(canApplyMetaTemplateStatus('failed', 'in_review')).toBe(false);
    expect(canApplyMetaTemplateStatus('submitting', 'in_review')).toBe(true);
  });
});

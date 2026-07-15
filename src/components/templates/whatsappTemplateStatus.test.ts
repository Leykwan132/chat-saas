import { describe, expect, test } from 'vitest';
import { getWhatsAppTemplateStatusPresentation } from './whatsappTemplateStatus';

describe('WhatsApp template status presentation', () => {
  test.each([
    ['submitting', 'Submitting', 'bg-amber-500', true],
    ['submitted', 'In review', 'bg-amber-500', true],
    ['in_review', 'In review', 'bg-amber-500', true],
    ['approved', 'Approved', 'bg-emerald-500', false],
    ['failed', 'Failed', 'bg-rose-500', false],
  ] as const)('presents %s', (status, label, indicatorClassName, pending) => {
    expect(getWhatsAppTemplateStatusPresentation(status)).toEqual({
      label,
      indicatorClassName,
      pending,
    });
  });
});

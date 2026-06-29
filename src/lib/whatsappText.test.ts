import { expect, test } from 'vitest';
import { splitWhatsAppText } from './whatsappText';

test('splits WhatsApp single-asterisk bold segments', () => {
  expect(splitWhatsAppText('Here are slots for *Tuesday, June 30, 2026*:')).toEqual([
    { text: 'Here are slots for ', bold: false },
    { text: 'Tuesday, June 30, 2026', bold: true },
    { text: ':', bold: false },
  ]);
});

test('handles bold slot labels in bullet-like lines', () => {
  expect(splitWhatsAppText('- 🕐 *9:00 AM – 9:30 AM*')).toEqual([
    { text: '- 🕐 ', bold: false },
    { text: '9:00 AM – 9:30 AM', bold: true },
  ]);
});

test('does not treat loose asterisks or double markdown as WhatsApp bold', () => {
  expect(splitWhatsAppText('* item\n**Markdown**')).toEqual([
    { text: '* item\n**Markdown**', bold: false },
  ]);
});

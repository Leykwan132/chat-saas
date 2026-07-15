import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const globalStyles = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const templatesPage = readFileSync(new URL('./pages/TemplatesPage.tsx', import.meta.url), 'utf8');

describe('Message Templates scrolling', () => {
  test('keeps the page scrollable without showing its vertical scrollbar or shifting for Select', () => {
    expect(templatesPage).toContain('data-templates-page');
    expect(globalStyles).toContain('main:has([data-templates-page])');
    expect(globalStyles).toContain('scrollbar-width: none;');
    expect(globalStyles).toContain('html:has([data-templates-page]) body[data-scroll-locked]');
    expect(globalStyles).toContain('margin-right: 0 !important;');
  });
});

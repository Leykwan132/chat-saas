import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const globalStyles = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const templatesPage = readFileSync(new URL('./pages/TemplatesPage.tsx', import.meta.url), 'utf8');
const broadcastPage = readFileSync(new URL('./pages/BroadcastPage.tsx', import.meta.url), 'utf8');

describe('dashboard page scrolling', () => {
  test('Message Templates stays scrollable without a vertical scrollbar or Select body shift', () => {
    expect(templatesPage).toContain('data-templates-page');
    expect(globalStyles).toContain('main:has([data-templates-page])');
    expect(globalStyles).toContain('scrollbar-width: none;');
    expect(globalStyles).toContain('html:has([data-templates-page]) body[data-scroll-locked]');
    expect(globalStyles).toContain('margin-right: 0 !important;');
  });

  test('Broadcast stays scrollable without a vertical scrollbar or body shift', () => {
    expect(broadcastPage).toContain('data-broadcast-page');
    expect(globalStyles).toContain('main:has([data-broadcast-page])');
    expect(globalStyles).toContain('html:has([data-broadcast-page]) body[data-scroll-locked]');
  });
});

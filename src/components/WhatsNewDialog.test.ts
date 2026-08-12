import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function readSource(relativePath: string) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  return existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';
}

const componentSource = readSource('./WhatsNewDialog.tsx');
const announcementsSource = readSource('./whats-new/announcements.ts');

test('opens an accessible scrollable What’s new dialog', () => {
  expect(componentSource).toContain('aria-label="What’s new"');
  expect(componentSource).toContain('<DialogTitle>What’s new</DialogTitle>');
  expect(componentSource).toContain('<DialogDescription>Review the latest improvements to Kilobot.</DialogDescription>');
  expect(componentSource).toContain('<ScrollArea');
  expect(componentSource).toContain('ANNOUNCEMENTS.map');
});

test('announces the current model recommendations', () => {
  expect(announcementsSource).toContain('New, more capable AI models');
  expect(announcementsSource).toContain('Qwen3.7 Flash');
  expect(announcementsSource).toContain('fast Chinese conversations');
  expect(announcementsSource).toContain('NVIDIA Nemotron 3.5 Lightning');
  expect(announcementsSource).toContain('faster English responses');
  expect(announcementsSource).toContain('GPT-5.6 Luna');
  expect(announcementsSource).toContain('slightly stronger performance');
  expect(announcementsSource).toContain('GPT-OSS 120B');
  expect(announcementsSource).toContain('budget-friendly reasoning');
});

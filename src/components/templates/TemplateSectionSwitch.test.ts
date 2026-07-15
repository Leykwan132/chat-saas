import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

function readSource(filename: string) {
  return readFileSync(fileURLToPath(new URL(filename, import.meta.url)), 'utf8');
}

test('template section switch shows an aligned color-coded state label before the switch', () => {
  const source = readSource('./TemplateSectionSwitch.tsx');
  const statusLabelIndex = source.indexOf("enabled ? 'Active' : 'Inactive'");
  const switchIndex = source.indexOf('<Switch', statusLabelIndex);

  expect(source).toContain("enabled ? 'text-emerald-600' : 'text-muted-foreground'");
  expect(source).toContain("'w-14 text-right text-xs font-medium'");
  expect(source).toContain('data-[state=checked]:bg-emerald-600');
  expect(statusLabelIndex).toBeGreaterThan(-1);
  expect(switchIndex).toBeGreaterThan(statusLabelIndex);
});

test.each([
  './TemplateHeaderSection.tsx',
  './TemplateButtonsSection.tsx',
  './TemplateFooterSection.tsx',
])('%s uses the shared labeled section switch', (filename) => {
  const source = readSource(filename);

  expect(source).toContain("import { TemplateSectionSwitch } from './TemplateSectionSwitch';");
  expect(source).toContain('<TemplateSectionSwitch');
  expect(source).not.toContain('<Switch');
});

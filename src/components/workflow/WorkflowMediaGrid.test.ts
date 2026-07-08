import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowMediaGrid.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow file media tiles open ready files in a new tab', () => {
  expect(source).toContain('function WorkflowFilePreviewTile');
  expect(source).toContain("aria-label={`Open ${entry.filename ?? 'file'} in new tab`}");
  expect(source).toContain('href={preview}');
  expect(source).toContain('target="_blank"');
  expect(source).toContain('rel="noopener noreferrer"');
});

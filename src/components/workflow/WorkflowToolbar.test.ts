import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowToolbar.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('workflow toolbar exposes a toggle-style horizontal or vertical button', () => {
  expect(source).toContain('layoutOrientation');
  expect(source).toContain('onArrange');
  expect(source).toContain('LoaderCircle');
  expect(source).toContain('arrangeLoading');
  expect(source).toContain("'Re-arranging'");
  expect(source).toContain("'animate-spin'");
  expect(source).toContain('layoutOrientation === \'horizontal\' ? Columns3 : Rows3');
  expect(source).toContain('{arrangeLabel}');
  expect(source).not.toContain('Arrange {arrangeLabel}');
  expect(source).not.toContain('aria-pressed={layoutOrientation ===');
  expect(source).not.toContain("layoutOrientation === 'vertical' && 'border-border bg-secondary");
});

test('workflow toolbar explains the purpose of the canvas', () => {
  expect(source).toContain(
    'Map how your agent responds, sends content, handles bookings, and routes conversations.',
  );
});

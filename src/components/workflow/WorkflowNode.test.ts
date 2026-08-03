import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./WorkflowNode.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const addMenuSource = readFileSync(
  fileURLToPath(new URL('./WorkflowAddNodeMenu.tsx', import.meta.url)),
  'utf8',
);

test('workflow node handles switch between vertical and horizontal anchors', () => {
  expect(source).toContain('data.layoutOrientation');
  expect(source).toContain('targetPosition');
  expect(source).toContain('sourcePosition');
  expect(source).toContain('isVertical ? Position.Top : Position.Left');
  expect(source).toContain('isVertical ? Position.Bottom : Position.Right');
  expect(source).toContain('Position.Left');
  expect(source).toContain('Position.Right');
  expect(source).toContain('Position.Top');
  expect(source).toContain('Position.Bottom');
  expect(source).toContain('vertical');
});

test('workflow node card does not render landing demo service labels', () => {
  expect(source).not.toContain('serviceLabels');
});

test('workflow node shows an accessible action-required alert when incomplete', () => {
  expect(source).toContain('Action Required');
  expect(source).toContain('aria-label="Action required"');
  expect(source).toContain('!data.isReady && !isCompact');
});

test('workflow node compact density reduces the card and direct controls', () => {
  expect(source).toContain("const isCompact = data.density === 'compact'");
  expect(source).toContain("'min-w-[150px] max-w-[255px]'");
  expect(source).toContain("'min-h-[68px] min-w-[150px] max-w-[255px] gap-[5px] rounded-[10px] px-3.5 py-3'");
  expect(source).toContain("'min-w-[187px]'");
  expect(source).toContain("'gap-2 text-sm'");
  expect(source).toContain("'size-7 rounded-md'");
  expect(source).toContain("'size-3.5'");
  expect(source).toContain("'text-[10px] leading-[1.35]'");
  expect(source).toContain('compact={isCompact}');
  expect(source).toContain("size={isCompact ? 'icon-sm' : 'icon'}");
});

test('workflow node standard density keeps the existing production classes', () => {
  expect(source).toContain("'min-w-[176px] max-w-[300px]'");
  expect(source).toContain("'min-h-20 min-w-[176px] max-w-[300px] gap-1.5 rounded-xl px-4 py-3.5'");
  expect(source).toContain("'min-w-[220px]'");
  expect(source).toContain("'gap-2.5 text-base'");
  expect(source).toContain("'size-8 rounded-lg'");
  expect(source).toContain("'text-xs leading-relaxed'");
});

test('workflow add control applies the compact button size and radius together', () => {
  expect(addMenuSource).toContain("size={compact ? 'icon-sm' : 'icon'}");
  expect(addMenuSource).toContain("compact ? 'rounded-lg' : 'rounded-xl'");
});

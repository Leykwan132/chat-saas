import { expect, test } from 'vitest';
import panelSource from './WebWidgetPreviewPanel.tsx?raw';

test('preview panel header uses normal agent name weight', () => {
  expect(panelSource).toContain('truncate text-sm font-normal');
  expect(panelSource).not.toContain('truncate text-sm font-semibold');
});

test('preview panel composer area has no top divider line', () => {
  expect(panelSource).toContain('relative z-10 bg-transparent p-4');
  expect(panelSource).not.toContain('border-t border-white/10');
});

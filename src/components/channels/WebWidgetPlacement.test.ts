import { expect, test } from 'vitest';
import layoutPickerSource from './WebWidgetLayoutPicker.tsx?raw';
import previewSource from './WebWidgetPreview.tsx?raw';
import settingsPanelSource from './WebWidgetSettingsPanel.tsx?raw';

test('web widget placement options are limited to middle and bottom right', () => {
  const values = Array.from(
    layoutPickerSource.matchAll(/value: '([^']+)'/g),
    (match) => match[1],
  );
  expect(values).toEqual(['input_bar', 'right_avatar']);
  expect(layoutPickerSource).toContain("label: 'Middle'");
  expect(layoutPickerSource).toContain("label: 'Bottom right'");
});

test('settings panel exposes placement and feeds it into the preview', () => {
  expect(settingsPanelSource).toContain('<WebWidgetLayoutPicker');
  expect(settingsPanelSource).toContain('layout={placementLayout}');
});

test('bottom right placement uses a single icon launcher', () => {
  expect(settingsPanelSource).not.toContain('launcherLabel');
  expect(settingsPanelSource).not.toContain('Pill text');
  expect(previewSource).not.toContain('MessagesSquare');
  expect(previewSource).not.toContain('MessageCircle');
  expect(previewSource).not.toContain('rounded-full bg-neutral-100');
  expect(previewSource).not.toContain('bg-neutral-100 px-3 text-sm font-normal text-neutral-950');
  expect(previewSource).not.toContain('bg-black px-3 text-sm font-normal text-white');
  expect(previewSource).not.toContain('px-3 pr-4');
  expect(previewSource).not.toContain('text-sm font-medium text-white');
  expect(previewSource).not.toContain('Need help?');
  expect(previewSource).toContain("const mobileLauncherPanelClassName = 'bottom-16");
  expect(previewSource).toContain("'bottom-16 w-full'");
  expect(previewSource).toContain('aria-label="Open preview chat icon"');
  expect(previewSource).not.toContain('aria-label="Open preview help"');
});

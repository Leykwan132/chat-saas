import { expect, test } from 'vitest';
import dialogSource from './WebWidgetDetailsDialog.tsx?raw';

test('website widget setup opens on Traditional by default', () => {
  expect(dialogSource).toContain('defaultValue="traditional"');
  expect(dialogSource).not.toContain('defaultValue={settings.activeMode}');
});

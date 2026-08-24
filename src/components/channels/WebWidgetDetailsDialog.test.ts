import { expect, test } from 'vitest';
import dialogSource from './WebWidgetDetailsDialog.tsx?raw';

test('website widget setup opens on AI-powered by default', () => {
  expect(dialogSource).toContain('defaultValue="ai_powered"');
  expect(dialogSource).not.toContain('defaultValue={settings.activeMode}');
});

test('website widget setup lists AI-powered before Traditional', () => {
  expect(dialogSource.indexOf('value="ai_powered">AI-powered')).toBeLessThan(
    dialogSource.indexOf('value="traditional">Traditional'),
  );
});

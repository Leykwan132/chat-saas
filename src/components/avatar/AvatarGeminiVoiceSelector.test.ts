import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('provides a manager Gemini Live voice selector with all supported options', () => {
  const path = new URL('./AvatarGeminiVoiceSelector.tsx', import.meta.url);
  expect(existsSync(path)).toBe(true);
  const source = readFileSync(path, 'utf8');
  expect(source).toContain('api.avatar.updateGeminiVoice');
  expect(source).toContain('<Select');
  expect(source).toContain('GEMINI_LIVE_VOICES.map');
  expect(source).toContain('Save voice');
  expect(source).toContain('shared/geminiLiveVoices');
});

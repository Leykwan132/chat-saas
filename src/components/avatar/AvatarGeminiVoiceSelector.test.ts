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
  expect(source).toContain('const showSave = draftVoice !== undefined || saving;');
  expect(source).toContain('>Voice</Label>');
  expect(source).toContain('text-base');
  expect(source).toContain('className="h-10 w-auto text-base"');
  expect(source).not.toContain('className="h-10 w-full text-base"');
  expect(source).toContain('shared/geminiLiveVoices');
  expect(source).not.toContain('Choose the voice Gemini uses during live Avatar conversations.');
  expect(source).not.toContain('<h2');
});

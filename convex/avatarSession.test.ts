import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('issues LITE Gemini tokens only after a provider context is saved', () => {
  const source = readFileSync(new URL('./avatarSession.ts', import.meta.url), 'utf8');
  expect(source).toContain('buildGeminiLiveTokenRequest');
  expect(source).toContain('HEYGEN_GEMINI_SECRET_ID');
  expect(source).toContain("Save an Avatar context before starting a session");
  expect(source).not.toContain('buildLiveAvatarTokenRequest({');
});

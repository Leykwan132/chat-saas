import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(
  new URL('./ChatPromptInput.tsx', import.meta.url),
  'utf8',
);

describe('Quick Replies composer feature flag', () => {
  test('mounts the picker only when saved replies are enabled', () => {
    expect(source).toContain('useShowSavedReplies()');
    expect(source).toContain('isProductFeatureEnabled(savedRepliesState)');
    expect(source).toMatch(
      /showSavedReplies\s*&&\s*\(\s*<ChatPromptInputQuickRepliesButton/,
    );
  });

  test('keeps the prompt input module below the file-size limit', () => {
    expect(source.split('\n').length).toBeLessThanOrEqual(300);
  });
});

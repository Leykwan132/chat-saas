import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarBackgroundEditor.tsx', import.meta.url), 'utf8');

describe('Avatar background editor', () => {
  it('uses the Avatar R2 upload and save APIs for images and videos', () => {
    expect(source).toContain('api.avatarCover.generateBackgroundUploadUrl');
    expect(source).toContain('api.avatarCover.saveBackground');
    expect(source).toContain('uploadWithProgress');
    expect(source).toContain('await saveBackground({ agentId, key, mimeType });');
    expect(source).toContain('accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"');
  });

  it('uses one upload tile for the configured background', () => {
    expect(source).toContain('Background');
    expect(source).toContain('backgroundType');
    expect(source).toContain('Click to replace');
    expect(source).toContain('group-hover:opacity-100');
    expect(source).not.toContain('removeBackground');
    expect(source).not.toContain('Trash2');
  });
});

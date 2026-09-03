import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarCoverImageEditor.tsx', import.meta.url), 'utf8');

describe('Avatar cover image editor', () => {
  it('uses the Avatar R2 upload and save APIs', () => {
    expect(source).toContain('api.avatarCover.generateCoverUploadUrl');
    expect(source).toContain('api.avatarCover.saveCoverImage');
    expect(source).toContain('uploadWithProgress');
    expect(source).toContain('await saveCoverImage({ agentId, key, mimeType });');
    expect(source).toContain('accept="image/png,image/jpeg,image/webp"');
  });

  it('uses one upload tile for the cover image', () => {
    expect(source).toContain('Cover image');
    expect(source).toContain('object-cover');
    expect(source).toContain('Click to replace');
    expect(source).toContain('group-hover:opacity-100');
    expect(source).not.toContain('removeCoverImage');
    expect(source).not.toContain('Trash2');
  });

  it('keeps the cover controls compact and title-only', () => {
    expect(source).toContain('className="text-base"');
    expect(source).toContain('h-32 w-full');
    expect(source).not.toContain('w-fit max-w-full');
    expect(source).not.toContain('Shown before a visitor starts a chat.');
    expect(source).not.toContain('up to 5 MB.');
  });
});

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

  it('supports replacing and removing the cover image', () => {
    expect(source).toContain('api.avatarCover.removeCoverImage');
    expect(source).toContain('Remove cover image');
    expect(source).toContain('Cover image');
    expect(source).toContain('object-cover');
  });
});

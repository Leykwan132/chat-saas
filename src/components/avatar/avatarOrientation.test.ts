import { describe, expect, it } from 'vitest';
import { classifyAvatarOrientation } from './avatarOrientation';

describe('avatar orientation', () => {
  it('classifies previews by their natural aspect ratio', () => {
    expect(classifyAvatarOrientation(1920, 1080)).toBe('landscape');
    expect(classifyAvatarOrientation(1080, 1920)).toBe('portrait');
    expect(classifyAvatarOrientation(1200, 1200)).toBe('landscape');
  });
});

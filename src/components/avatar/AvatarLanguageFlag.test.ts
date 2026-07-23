import { describe, expect, it } from 'vitest';
import { getLanguageFlagRegion } from './AvatarLanguageFlag';

describe('Avatar language flags', () => {
  it('derives countries and omits non-country languages', () => {
    expect(getLanguageFlagRegion('ms')).toBe('my');
    expect(getLanguageFlagRegion('ja')).toBe('jp');
    expect(getLanguageFlagRegion('multi')).toBeUndefined();
    expect(getLanguageFlagRegion('%%%')).toBeUndefined();
  });
});

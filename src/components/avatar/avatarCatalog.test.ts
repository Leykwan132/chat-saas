import { describe, expect, it } from 'vitest';
import type { OrientedAvatarOption } from './avatarOrientation';
import { filterBackgroundFreeAvatars, splitAvatarOptions } from './avatarCatalog';

function avatar(id: string, name: string, orientation: 'landscape' | 'portrait'): OrientedAvatarOption {
  return { id, name, orientation, previewUrl: `https://example.com/${id}.png` };
}

describe('Avatar catalog curation', () => {
  it('keeps outfit-based avatars and excludes complete scene names', () => {
    const options = [
      avatar('green-screen', 'Alessandra in Black Suit', 'landscape'),
      avatar('therapist', 'Ann Therapist', 'landscape'),
      avatar('doctor', 'Judy Doctor Sitting', 'portrait'),
      avatar('fireplace', 'Santa Fireplace Front', 'landscape'),
    ];

    expect(filterBackgroundFreeAvatars(options).map((option) => option.id)).toEqual(['green-screen']);
  });

  it('shows the first four eligible avatars as Defaults before orientation groups', () => {
    const options = [
      avatar('one', 'One in Black Suit', 'landscape'),
      avatar('two', 'Two in Grey Sweater', 'portrait'),
      avatar('three', 'Three in Blue Suit', 'landscape'),
      avatar('four', 'Four in Black Shirt', 'portrait'),
      avatar('five', 'Five in White Shirt', 'landscape'),
      avatar('scene', 'Santa Fireplace Front', 'landscape'),
    ];

    const groups = splitAvatarOptions(options);
    expect(groups.defaultAvatars.map((option) => option.id)).toEqual(['one', 'two', 'three', 'four']);
    expect(groups.landscapeAvatars.map((option) => option.id)).toEqual(['five']);
    expect(groups.portraitAvatars).toHaveLength(0);
  });
});

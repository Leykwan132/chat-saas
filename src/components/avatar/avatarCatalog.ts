import type { AvatarOption } from './avatarTypes';
import type { OrientedAvatarOption } from './avatarOrientation';

const COMPLETE_SCENE_AVATAR_NAMES = new Set([
  'ann therapist',
  'judy doctor sitting',
  'santa fireplace front',
]);
const DEFAULT_AVATAR_COUNT = 4;

export function isBackgroundFreeAvatar(avatar: AvatarOption) {
  const name = avatar.name.trim().toLowerCase();
  return name.includes(' in ') && !COMPLETE_SCENE_AVATAR_NAMES.has(name);
}

export function filterBackgroundFreeAvatars<T extends AvatarOption>(avatars: T[]) {
  return avatars.filter(isBackgroundFreeAvatar);
}

export function splitAvatarOptions(avatars: OrientedAvatarOption[]) {
  const backgroundFreeAvatars = filterBackgroundFreeAvatars(avatars);
  const defaultAvatars = backgroundFreeAvatars.slice(0, DEFAULT_AVATAR_COUNT);
  const defaultIds = new Set(defaultAvatars.map((avatar) => avatar.id));
  const remainingAvatars = backgroundFreeAvatars.filter((avatar) => !defaultIds.has(avatar.id));

  return {
    defaultAvatars,
    landscapeAvatars: remainingAvatars.filter((avatar) => avatar.orientation === 'landscape'),
    portraitAvatars: remainingAvatars.filter((avatar) => avatar.orientation === 'portrait'),
  };
}

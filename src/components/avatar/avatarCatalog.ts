import type { AvatarOption } from './avatarTypes';
import type { OrientedAvatarOption } from './avatarOrientation';

const COMPLETE_SCENE_AVATAR_NAMES = new Set([
  'ann therapist',
  'judy doctor sitting',
  'santa fireplace front',
]);

export function isBackgroundFreeAvatar(avatar: AvatarOption) {
  const name = avatar.name.trim().toLowerCase();
  return name.includes(' in ') && !COMPLETE_SCENE_AVATAR_NAMES.has(name);
}

export function filterBackgroundFreeAvatars<T extends AvatarOption>(avatars: T[]) {
  return avatars.filter(isBackgroundFreeAvatar);
}

export function splitAvatarOptions(avatars: OrientedAvatarOption[]) {
  const backgroundFreeAvatars = filterBackgroundFreeAvatars(avatars);
  return {
    landscapeAvatars: backgroundFreeAvatars.filter((avatar) => avatar.orientation === 'landscape'),
    portraitAvatars: backgroundFreeAvatars.filter((avatar) => avatar.orientation === 'portrait'),
  };
}

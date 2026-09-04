import type { AvatarOption } from './avatarTypes';

export type AvatarOrientation = 'landscape' | 'portrait';
export type OrientedAvatarOption = AvatarOption & {
  orientation: AvatarOrientation;
};

export function classifyAvatarOrientation(width: number, height: number): AvatarOrientation {
  return width >= height ? 'landscape' : 'portrait';
}

function loadPreviewDimensions(previewUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Could not load avatar preview'));
    image.src = previewUrl;
  });
}

export async function loadAvatarOrientations(avatars: AvatarOption[]): Promise<OrientedAvatarOption[]> {
  return await Promise.all(avatars.map(async (avatar) => {
    if (!avatar.previewUrl) throw new Error(`Preview unavailable for ${avatar.name}`);
    const dimensions = await loadPreviewDimensions(avatar.previewUrl);
    return {
      ...avatar,
      orientation: classifyAvatarOrientation(dimensions.width, dimensions.height),
    };
  }));
}

import type {
  HeaderMediaByType,
  HeaderMediaState,
  HeaderType,
  MediaHeaderType,
} from './templateBuilderTypes';

export const initialHeaderMedia: HeaderMediaState = {
  r2Key: null,
  previewUrl: null,
  pendingFile: null,
  uploadStatus: 'idle',
  fileName: null,
  fileSize: null,
  fileMime: null,
};

export function isMediaHeader(type: HeaderType): type is MediaHeaderType {
  return type === 'DOCUMENT' || type === 'IMAGE' || type === 'VIDEO';
}

export function headerMediaForType(
  mediaByType: HeaderMediaByType,
  type: MediaHeaderType,
) {
  return mediaByType[type] ?? initialHeaderMedia;
}

export function setHeaderMediaForType(
  mediaByType: HeaderMediaByType,
  type: MediaHeaderType,
  media: HeaderMediaState,
) {
  return { ...mediaByType, [type]: media };
}

export function headerMediaByTypeFromMedia(
  type: HeaderType,
  media: HeaderMediaState,
): HeaderMediaByType {
  return isMediaHeader(type) ? { [type]: media } : {};
}

export function revokeHeaderMediaPreviewUrl(media: HeaderMediaState) {
  if (media.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(media.previewUrl);
  }
}

export function revokeHeaderMediaPreviewUrls(mediaByType: HeaderMediaByType) {
  Object.values(mediaByType).forEach((media) => {
    if (media) revokeHeaderMediaPreviewUrl(media);
  });
}

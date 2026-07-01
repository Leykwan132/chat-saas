import type {
  HeaderMediaByType,
  HeaderMediaState,
  HeaderType,
} from './templateBuilderTypes';
import {
  headerMediaForType,
  initialHeaderMedia,
  isMediaHeader,
} from './templateHeaderMediaState';

type HeaderInput = {
  format?: string;
  r2Key?: string;
  filename?: string;
  mimeType?: string;
};

type ComparableHeaderState = {
  headerEnabled: boolean;
  headerType: HeaderType;
  headerMediaByType: HeaderMediaByType;
};

export function headerTypeForComponent(header: HeaderInput | null): HeaderType {
  const format = header?.format?.toUpperCase();
  if (format === 'IMAGE' || format === 'VIDEO' || format === 'DOCUMENT') return format;
  return 'TEXT';
}

export function headerMediaForComponent(
  header: HeaderInput | null,
  headerType: HeaderType,
): HeaderMediaState {
  if (!header || headerType === 'TEXT') return initialHeaderMedia;
  return {
    r2Key: header.r2Key ?? null,
    previewUrl: null,
    pendingFile: null,
    uploadStatus: header.r2Key ? 'ready' : 'idle',
    fileName: header.filename ?? null,
    fileSize: null,
    fileMime: header.mimeType ?? null,
  };
}

export function comparableHeaderMedia(state: ComparableHeaderState) {
  if (!state.headerEnabled || !isMediaHeader(state.headerType)) return null;
  const media = headerMediaForType(state.headerMediaByType, state.headerType);
  return {
    r2Key: media.r2Key,
    fileName: media.fileName,
    fileMime: media.fileMime,
    uploadStatus: media.uploadStatus,
    pendingFileName: media.pendingFile?.name ?? null,
  };
}

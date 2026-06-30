import type { Doc } from "../_generated/dataModel";

type MediaItem = {
  url: string;
  mediaType?: string;
};

type ErrorResult = {
  error: string;
  errorCode?: number;
  policy?: string;
};

export type MediaSendLogContext = {
  service: string;
  route: string;
  channelId?: string;
  mediaCount?: number;
  mediaTypes?: string[];
  hasText?: boolean;
  itemIndex?: number;
  batchIndex?: number;
  batchSize?: number;
};

export function mediaSendLogContext(
  conversation: Pick<Doc<"conversations">, "service">,
  channel: Partial<Pick<Doc<"channels">, "_id">>,
  route: string,
  mediaItems: MediaItem[],
  extra: Partial<MediaSendLogContext> = {},
): MediaSendLogContext {
  return {
    service: conversation.service,
    route,
    channelId: channel._id,
    mediaCount: mediaItems.length,
    mediaTypes: mediaItems.map(mediaTypeLabel),
    ...extra,
  };
}

export function logMediaSendStart(context: MediaSendLogContext) {
  console.info("[mediaSend] start", context);
}

export function logMediaSendDone(
  context: MediaSendLogContext,
  externalIds: string[] = [],
) {
  console.info("[mediaSend] done", {
    ...context,
    externalIdCount: externalIds.length,
  });
}

export function logMediaSendGraphSuccess(
  context: MediaSendLogContext | undefined,
  httpStatus: number,
  externalId: string | undefined,
) {
  if (!context) return;
  console.info("[mediaSend] graph_success", {
    ...context,
    httpStatus,
    externalId,
  });
}

export function logMediaSendGraphError(
  context: MediaSendLogContext | undefined,
  details: {
    httpStatus: number;
    error: string;
    errorCode?: number;
    errorSubcode?: number;
  },
) {
  if (!context) return;
  console.error("[mediaSend] graph_error", {
    ...context,
    ...details,
  });
}

export function logMediaSendResultError(
  context: MediaSendLogContext,
  result: ErrorResult,
) {
  console.error("[mediaSend] error", {
    ...context,
    error: result.error,
    errorCode: result.errorCode,
    policy: result.policy,
  });
}

function mediaTypeLabel(item: MediaItem) {
  const mediaType = item.mediaType ?? inferMediaTypeFromUrl(item.url);
  if (mediaType.startsWith("image/")) return `image:${mediaType}`;
  if (mediaType.startsWith("video/")) return `video:${mediaType}`;
  return `file:${mediaType}`;
}

function inferMediaTypeFromUrl(url: string) {
  const lower = url.split("?")[0].toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mpeg") || lower.endsWith(".mpg")) return "video/mpeg";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".3gp")) return "video/3gpp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

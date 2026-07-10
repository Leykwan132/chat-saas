export const BROADCAST_MESSAGE_KIND = "broadcast" as const;

export type BroadcastMessageKind = typeof BROADCAST_MESSAGE_KIND;
export type BroadcastHeaderFormat = "IMAGE" | "VIDEO" | "DOCUMENT";

export type BroadcastHeaderAsset = {
  url: string;
  mimeType: string;
  filename: string;
  headerFormat: BroadcastHeaderFormat;
};

export type BroadcastPresentation = {
  headerAsset?: BroadcastHeaderAsset;
};

const HEADER_FORMATS = new Set<BroadcastHeaderFormat>([
  "IMAGE",
  "VIDEO",
  "DOCUMENT",
]);

export function isBroadcastPresentation(
  value: unknown,
): value is BroadcastPresentation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const headerAsset = (value as BroadcastPresentation).headerAsset;
  if (headerAsset === undefined) return true;
  return (
    typeof headerAsset.url === "string" &&
    typeof headerAsset.mimeType === "string" &&
    typeof headerAsset.filename === "string" &&
    HEADER_FORMATS.has(headerAsset.headerFormat)
  );
}

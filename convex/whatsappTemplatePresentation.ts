import type {
  BroadcastHeaderAsset,
  BroadcastHeaderFormat,
} from "../shared/broadcastMessage";

type PreparedHeaderAsset = {
  mimeType: string;
  filename: string;
  headerFormat: BroadcastHeaderFormat;
};

export function buildWhatsAppTemplateHeaderAsset(
  asset: PreparedHeaderAsset | null,
  publicUrl: string | undefined,
): BroadcastHeaderAsset | undefined {
  if (asset === null) return undefined;
  if (!publicUrl) {
    throw new Error("Broadcast template header media is missing its public URL.");
  }
  return { ...asset, url: publicUrl };
}

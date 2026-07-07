import type { Doc } from "../_generated/dataModel";
import { getPublicMediaUrl } from "./r2";

export function requireReadyMediaPublicUrl(row: Doc<"mediaUploads">) {
  if (row.status !== "ready") {
    throw new Error(`Media ${row.clientId} is not ready`);
  }
  if (row.publicUrl) {
    return row.publicUrl;
  }
  if (row.r2Key) {
    return getPublicMediaUrl(row.r2Key);
  }
  throw new Error(`Ready media ${row.clientId} is missing public URL and R2 key`);
}

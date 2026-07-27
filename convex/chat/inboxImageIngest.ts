import type { ActionCtx } from "../_generated/server";
import { storeWhatsAppMediaInR2 } from "./whatsappMediaIngest";

export async function resolveWhatsAppImageFiles(
  ctx: ActionCtx,
  args: {
    mediaId: string;
    mediaUrl?: string;
    mimeTypeHint?: string;
    phoneNumberId: string;
    accessToken: string;
    orgId: string;
  },
): Promise<Array<{ url: string; mimeType: string }>> {
  return [
    await storeWhatsAppMediaInR2(ctx, {
      kind: "image",
      ...args,
    }),
  ];
}

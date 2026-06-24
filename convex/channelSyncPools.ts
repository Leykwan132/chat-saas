import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

// Dedicated workpool for backfilling and syncing Instagram conversations.
// Kept separate from the Cloudflare/scraper pools (which live in workpool.ts
// and run under the Node.js runtime) so that the Instagram workers can stay
// on the default Convex runtime — they only need the built-in `fetch`.
export const instagramSyncPool = new Workpool(
  components.instagramSyncWorkpool,
  { maxParallelism: 2 },
);

// Same shape for Messenger; isolated pool so a rate-limit storm on one
// platform does not block the other.
export const messengerSyncPool = new Workpool(
  components.messengerSyncWorkpool,
  { maxParallelism: 2 },
);

// WhatsApp coexistence sync can deliver large history chunks. Keep this pool
// small so webhook-triggered ingestion never floods the inbox writer path.
export const whatsappSyncPool = new Workpool(
  components.whatsappSyncWorkpool,
  { maxParallelism: 2 },
);

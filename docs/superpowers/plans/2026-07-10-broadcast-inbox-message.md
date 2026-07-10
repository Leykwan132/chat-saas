# Broadcast Inbox Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist broadcast identity and typed WhatsApp template header media, then render one distinct inbox message block with the asset above the template text and a bottom-left `Broadcast` label.

**Architecture:** Introduce one shared, framework-free broadcast message contract used by Convex and React. The template builder returns typed presentation data alongside the unchanged Meta payload; broadcast completion passes that data through channel ingestion into both the message ledger and Agent metadata. Inbox mapping exposes the metadata to a focused broadcast frame component while regular message rendering remains unchanged.

**Tech Stack:** TypeScript 6, Convex, `@convex-dev/agent`, React 19, Tailwind CSS, Lucide React, Vitest 1.6.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every new code file below 300 lines.
- Do not infer broadcast identity from visible text.
- Use the exact visible label `Broadcast` with a Lucide megaphone icon.
- Header assets support exactly `IMAGE`, `VIDEO`, and `DOCUMENT`.
- Do not change regular inbox message appearance or Meta send payload behavior.
- Do not add comments unless the code cannot be made self-explanatory.
- Preserve unrelated dirty-worktree changes.

---

### Task 1: Shared Broadcast Metadata Contract

**Files:**
- Create: `shared/broadcastMessage.ts`
- Create: `shared/broadcastMessage.test.ts`
- Create: `convex/broadcastMessageValidators.ts`
- Modify: `convex/schema.ts`

**Interfaces:**
- Produces: `BROADCAST_MESSAGE_KIND`, `BroadcastMessageKind`, `BroadcastHeaderFormat`, `BroadcastHeaderAsset`, `BroadcastPresentation`, and `isBroadcastPresentation`.
- Produces: `messageKindValidator` and `broadcastPresentationValidator` for Convex functions and schema fields.
- Produces schema fields: optional `messageKind` and optional `broadcastPresentation` on `messages`.

- [ ] **Step 1: Write the failing shared-contract test**

```ts
import { expect, test } from "vitest";
import {
  BROADCAST_MESSAGE_KIND,
  isBroadcastPresentation,
} from "./broadcastMessage";

test("accepts typed broadcast header presentation metadata", () => {
  expect(BROADCAST_MESSAGE_KIND).toBe("broadcast");
  expect(
    isBroadcastPresentation({
      headerAsset: {
        url: "https://cdn.example.com/header.jpg",
        mimeType: "image/jpeg",
        filename: "header.jpg",
        headerFormat: "IMAGE",
      },
    }),
  ).toBe(true);
});

test("rejects unsupported broadcast header formats", () => {
  expect(
    isBroadcastPresentation({
      headerAsset: {
        url: "https://cdn.example.com/header.bin",
        mimeType: "application/octet-stream",
        filename: "header.bin",
        headerFormat: "AUDIO",
      },
    }),
  ).toBe(false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/broadcastMessage.test.ts`

Expected: FAIL because `shared/broadcastMessage.ts` does not exist.

- [ ] **Step 3: Implement the shared contract**

```ts
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

export function isBroadcastPresentation(value: unknown): value is BroadcastPresentation {
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
```

Create `convex/broadcastMessageValidators.ts` and import its validators into `convex/schema.ts` and later into `convex/chat/threads.ts`:

```ts
import { v } from "convex/values";

export const messageKindValidator = v.literal("broadcast");

export const broadcastHeaderAssetValidator = v.object({
  url: v.string(),
  mimeType: v.string(),
  filename: v.string(),
  headerFormat: v.union(
    v.literal("IMAGE"),
    v.literal("VIDEO"),
    v.literal("DOCUMENT"),
  ),
});

export const broadcastPresentationValidator = v.object({
  headerAsset: v.optional(broadcastHeaderAssetValidator),
});
```

```ts
messageKind: v.optional(messageKindValidator),
broadcastPresentation: v.optional(broadcastPresentationValidator),
```

- [ ] **Step 4: Run the shared test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/broadcastMessage.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the shared contract**

```bash
git add shared/broadcastMessage.ts shared/broadcastMessage.test.ts convex/broadcastMessageValidators.ts convex/schema.ts
git commit -m "Add broadcast message metadata contract"
```

---

### Task 2: Build Template Presentation Data

**Files:**
- Create: `convex/whatsappTemplatePresentation.ts`
- Create: `convex/whatsappTemplatePresentation.test.ts`
- Modify: `convex/whatsappTemplateSendPayload.ts`
- Modify: `convex/whatsappTemplateSendPayload.test.ts`
- Modify: `convex/broadcastChatContent.ts`
- Modify: `convex/broadcastChatContent.test.ts`

**Interfaces:**
- Consumes: `BroadcastHeaderAsset` from `shared/broadcastMessage.ts`.
- Produces: `buildWhatsAppTemplateHeaderAsset(asset, publicUrl)` returning `BroadcastHeaderAsset | undefined`.
- Extends: `buildWhatsAppTemplateSendPayloadWithContent` result with optional `headerAsset` while preserving `template` and `renderedContent`.
- Produces: `formatBroadcastMessageContent(renderedContent)` returning only trimmed customer-visible template text.

- [ ] **Step 1: Write failing presentation and content tests**

```ts
import { expect, test } from "vitest";
import { buildWhatsAppTemplateHeaderAsset } from "./whatsappTemplatePresentation";

test("builds typed image header presentation", () => {
  expect(
    buildWhatsAppTemplateHeaderAsset(
      { mimeType: "image/jpeg", filename: "offer.jpg", headerFormat: "IMAGE" },
      "https://cdn.example.com/offer.jpg",
    ),
  ).toEqual({
    url: "https://cdn.example.com/offer.jpg",
    mimeType: "image/jpeg",
    filename: "offer.jpg",
    headerFormat: "IMAGE",
  });
});

test.each(["VIDEO", "DOCUMENT"] as const)(
  "preserves %s header format",
  (headerFormat) => {
    const mimeType = headerFormat === "VIDEO" ? "video/mp4" : "application/pdf";
    expect(
      buildWhatsAppTemplateHeaderAsset(
        { mimeType, filename: "asset", headerFormat },
        "https://cdn.example.com/asset",
      )?.headerFormat,
    ).toBe(headerFormat);
  },
);

test("returns no presentation for a template without header media", () => {
  expect(buildWhatsAppTemplateHeaderAsset(null, undefined)).toBeUndefined();
});
```

Add a source integration assertion to `convex/whatsappTemplateSendPayload.test.ts`:

```ts
import { readFileSync } from "node:fs";

test("template payload builder returns prepared header presentation", () => {
  const source = readFileSync(
    new URL("./whatsappTemplateSendPayload.ts", import.meta.url),
    "utf8",
  );
  expect(source).toContain("buildWhatsAppTemplateHeaderAsset");
  expect(source).toContain("getPublicMediaUrl(mediaAsset.r2Key)");
  expect(source).toContain("headerAsset");
});
```

Replace the old marketing-prefix assertions in `convex/broadcastChatContent.test.ts`:

```ts
import { expect, test } from "vitest";
import { formatBroadcastMessageContent } from "./broadcastChatContent";

test("keeps only rendered broadcast template content", () => {
  expect(formatBroadcastMessageContent("  Hi Jessica, summer sale is live.  ")).toBe(
    "Hi Jessica, summer sale is live.",
  );
});

test("keeps missing rendered content empty", () => {
  expect(formatBroadcastMessageContent("   ")).toBe("");
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplatePresentation.test.ts convex/broadcastChatContent.test.ts`

Expected: FAIL because the presentation helper and new formatter do not exist.

- [ ] **Step 3: Implement presentation extraction and clean visible content**

```ts
import type { BroadcastHeaderAsset, BroadcastHeaderFormat } from "../shared/broadcastMessage";

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
  if (!publicUrl) throw new Error("Broadcast template header media is missing its public URL.");
  return { ...asset, url: publicUrl };
}
```

Update `TemplateSendBuildResult` in `convex/whatsappTemplateSendPayload.ts`:

```ts
type TemplateSendBuildResult = {
  template: TemplateSendPayload;
  renderedContent: string;
  headerAsset?: BroadcastHeaderAsset;
};
```

After the prepared header is validated, derive its URL with `getPublicMediaUrl(mediaAsset.r2Key)`, build `headerAsset`, and return it without changing `payload.components`.

Replace `convex/broadcastChatContent.ts` with:

```ts
export function formatBroadcastMessageContent(renderedContent: string) {
  return renderedContent.trim();
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/whatsappTemplatePresentation.test.ts convex/whatsappTemplateSendPayload.test.ts convex/broadcastChatContent.test.ts`

Expected: all focused tests PASS and Meta payload assertions remain unchanged.

- [ ] **Step 5: Commit template presentation data**

```bash
git add convex/whatsappTemplatePresentation.ts convex/whatsappTemplatePresentation.test.ts convex/whatsappTemplateSendPayload.ts convex/whatsappTemplateSendPayload.test.ts convex/broadcastChatContent.ts convex/broadcastChatContent.test.ts
git commit -m "Preserve broadcast template presentation data"
```

---

### Task 3: Persist and Map Broadcast Metadata

**Files:**
- Create: `convex/chat/broadcastMessageMetadata.ts`
- Create: `convex/chat/broadcastMessageMetadata.test.ts`
- Modify: `convex/chat/threads.ts`
- Modify: `convex/broadcastPool.ts`
- Modify: `convex/chat/inboxMessageMapping.ts`
- Modify: `src/lib/inboxOptimistic.ts`

**Interfaces:**
- Consumes: `BroadcastMessageKind` and `BroadcastPresentation`.
- Produces: `broadcastAgentMetadata(messageKind, presentation)` for Agent metadata.
- Extends: `IngestChannelMessageArgs` with optional `messageKind` and `broadcastPresentation`.
- Extends: `InboxUIMessage` with optional `isBroadcast` and `broadcastPresentation`.

- [ ] **Step 1: Write the failing metadata helper test**

```ts
import { expect, test } from "vitest";
import { broadcastAgentMetadata, resolveBroadcastMetadata } from "./broadcastMessageMetadata";

const presentation = {
  headerAsset: {
    url: "https://cdn.example.com/header.jpg",
    mimeType: "image/jpeg",
    filename: "header.jpg",
    headerFormat: "IMAGE" as const,
  },
};

test("builds Agent metadata for broadcasts", () => {
  expect(broadcastAgentMetadata("broadcast", presentation)).toEqual({
    inboxMessageKind: "broadcast",
    broadcastPresentation: presentation,
  });
});

test("resolves Agent metadata before ledger fallback", () => {
  expect(
    resolveBroadcastMetadata(
      { inboxMessageKind: "broadcast", broadcastPresentation: presentation },
      undefined,
    ),
  ).toEqual({ isBroadcast: true, broadcastPresentation: presentation });
});

test("leaves normal messages unclassified", () => {
  expect(resolveBroadcastMetadata({}, undefined)).toEqual({ isBroadcast: false });
});
```

Add source integration assertions to the same test file:

```ts
import { readFileSync } from "node:fs";

test("broadcast completion persists metadata and inbox mapping exposes it", () => {
  const poolSource = readFileSync(new URL("../broadcastPool.ts", import.meta.url), "utf8");
  const threadSource = readFileSync(new URL("./threads.ts", import.meta.url), "utf8");
  const mappingSource = readFileSync(
    new URL("./inboxMessageMapping.ts", import.meta.url),
    "utf8",
  );
  expect(poolSource).toContain('messageKind: "broadcast"');
  expect(poolSource).toContain("broadcastPresentation");
  expect(threadSource).toContain("broadcastAgentMetadata");
  expect(mappingSource).toContain("resolveBroadcastMetadata");
});
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/broadcastMessageMetadata.test.ts`

Expected: FAIL because `broadcastMessageMetadata.ts` does not exist.

- [ ] **Step 3: Implement metadata propagation**

Create pure helpers in `convex/chat/broadcastMessageMetadata.ts` using the exact metadata keys `inboxMessageKind` and `broadcastPresentation`.

Extend `ingestChannelMessageArgs` and `IngestChannelMessageArgs`:

```ts
messageKind: v.optional(messageKindValidator),
broadcastPresentation: v.optional(broadcastPresentationValidator),
```

Implement `convex/chat/broadcastMessageMetadata.ts`:

```ts
import {
  BROADCAST_MESSAGE_KIND,
  type BroadcastMessageKind,
  type BroadcastPresentation,
} from "../../shared/broadcastMessage";

export type BroadcastAgentMessageMetadata = {
  inboxMessageKind?: BroadcastMessageKind;
  broadcastPresentation?: BroadcastPresentation;
};

type BroadcastLedgerMetadata = {
  messageKind?: BroadcastMessageKind;
  broadcastPresentation?: BroadcastPresentation;
};

export function broadcastAgentMetadata(
  messageKind: BroadcastMessageKind | undefined,
  broadcastPresentation: BroadcastPresentation | undefined,
): BroadcastAgentMessageMetadata {
  if (messageKind !== BROADCAST_MESSAGE_KIND) return {};
  return {
    inboxMessageKind: messageKind,
    ...(broadcastPresentation ? { broadcastPresentation } : {}),
  };
}

export function resolveBroadcastMetadata(
  agentMetadata: BroadcastAgentMessageMetadata,
  ledgerMetadata: BroadcastLedgerMetadata | undefined,
) {
  const isBroadcast =
    (agentMetadata.inboxMessageKind ?? ledgerMetadata?.messageKind) ===
    BROADCAST_MESSAGE_KIND;
  const broadcastPresentation =
    agentMetadata.broadcastPresentation ?? ledgerMetadata?.broadcastPresentation;
  return {
    isBroadcast,
    ...(isBroadcast && broadcastPresentation ? { broadcastPresentation } : {}),
  };
}
```

Add `messageMetadata?: Record<string, unknown>` to `saveHumanReply` options and pass it into `saveAssistantWithOwnOrder`. Pass `broadcastAgentMetadata(args.messageKind, args.broadcastPresentation)` from `ingestChannelMessage` through that path. Spread the same optional values into every ledger insert so delivery receipts and metadata share one row identity.

Update `broadcastWorker` to return `headerAsset` in both real-send and skip-send paths. Update `broadcastComplete` to ingest:

```ts
content: formatBroadcastMessageContent(renderedContent),
contentType: "text",
messageKind: "broadcast",
broadcastPresentation: returnValue.headerAsset
  ? { headerAsset: returnValue.headerAsset }
  : {},
```

Update inbox mapping to call `resolveBroadcastMetadata` with Agent metadata first and the matched ledger row second. Add the returned fields to `InboxUIMessage` in both `convex/chat/inboxMessageMapping.ts` and `src/lib/inboxOptimistic.ts`.

- [ ] **Step 4: Run metadata and existing broadcast tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/chat/broadcastMessageMetadata.test.ts convex/broadcastChatContent.test.ts convex/whatsappTemplateSendPayload.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 5: Regenerate Convex API types**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && STRIPE_PRICE_STARTER_MONTHLY=mock_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=mock_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=mock_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=mock_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=mock_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=mock_business_annual STRIPE_PRICE_EXTRA_CREDITS_2000=mock_extra_2000 STRIPE_PRICE_EXTRA_CREDITS_5000=mock_extra_5000 STRIPE_PRICE_EXTRA_CREDITS_15000=mock_extra_15000 bunx convex codegen`

Expected: code generation completes and keeps `convex/_generated/api.d.ts` current.

- [ ] **Step 6: Commit persistence and mapping**

```bash
git add convex/chat/broadcastMessageMetadata.ts convex/chat/broadcastMessageMetadata.test.ts convex/chat/threads.ts convex/broadcastPool.ts convex/chat/inboxMessageMapping.ts src/lib/inboxOptimistic.ts convex/_generated/api.d.ts
git commit -m "Persist broadcast inbox metadata"
```

---

### Task 4: Render the Distinct Broadcast Message Block

**Files:**
- Create: `src/components/inbox/InboxBroadcastMessage.tsx`
- Create: `src/components/inbox/InboxBroadcastMessage.test.ts`
- Modify: `src/components/inbox/InboxThreadMessages.tsx`

**Interfaces:**
- Consumes: `BroadcastPresentation` and customer-visible formatted text children.
- Produces: `InboxBroadcastMessage`, a neutral frame with optional header asset and bottom-left `Megaphone` + `Broadcast` label.

- [ ] **Step 1: Write the failing source contract test**

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const frameSource = readFileSync(
  new URL("./InboxBroadcastMessage.tsx", import.meta.url),
  "utf8",
);
const threadSource = readFileSync(
  new URL("./InboxThreadMessages.tsx", import.meta.url),
  "utf8",
);

test("broadcast frame contains typed media and a bottom-left label", () => {
  expect(frameSource).toContain("Megaphone");
  expect(frameSource).toContain(">Broadcast<");
  expect(frameSource).toContain('headerFormat === "IMAGE"');
  expect(frameSource).toContain('headerFormat === "VIDEO"');
  expect(frameSource).toContain('headerFormat === "DOCUMENT"');
  expect(frameSource).toContain("items-center gap-1");
});

test("thread renderer selects the broadcast frame from metadata", () => {
  expect(threadSource).toContain("message.isBroadcast");
  expect(threadSource).toContain("<InboxBroadcastMessage");
  expect(threadSource).toContain("message.broadcastPresentation");
});
```

- [ ] **Step 2: Run the UI contract test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBroadcastMessage.test.ts`

Expected: FAIL because `InboxBroadcastMessage.tsx` does not exist.

- [ ] **Step 3: Implement the focused broadcast frame**

Create `InboxBroadcastMessage.tsx` with:

```tsx
import { ExternalLink, FileText, Megaphone } from "lucide-react";
import type { ReactNode } from "react";
import type { BroadcastHeaderAsset, BroadcastPresentation } from "../../../shared/broadcastMessage";

function BroadcastHeader({ asset }: { asset: BroadcastHeaderAsset }) {
  if (asset.headerFormat === "IMAGE") {
    return <img src={asset.url} alt={asset.filename} className="max-h-72 w-full object-cover" />;
  }
  if (asset.headerFormat === "VIDEO") {
    return <video src={asset.url} controls preload="metadata" className="max-h-72 w-full bg-black" />;
  }
  return (
    <a href={asset.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-b px-3 py-3">
      <FileText className="size-4" />
      <span className="min-w-0 flex-1 truncate text-sm">{asset.filename}</span>
      <ExternalLink className="size-3.5" />
    </a>
  );
}

export function InboxBroadcastMessage({
  presentation,
  children,
}: {
  presentation?: BroadcastPresentation;
  children?: ReactNode;
}) {
  return (
    <div className="w-fit max-w-full overflow-hidden rounded-md border border-border bg-muted/40 text-foreground">
      {presentation?.headerAsset ? <BroadcastHeader asset={presentation.headerAsset} /> : null}
      {children ? <div className="px-3 py-2 text-sm leading-snug">{children}</div> : null}
      <div className="flex items-center gap-1 border-t border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <Megaphone className="size-3" />
        <span>Broadcast</span>
      </div>
    </div>
  );
}
```

In `InboxMessageBody`, branch on `message.isBroadcast` before regular attachment/bubble rendering and pass `message.broadcastPresentation`. Render `WhatsAppFormattedText` as the child only when visible text is non-empty. Do not apply the regular blue outgoing bubble classes inside the broadcast frame.

- [ ] **Step 4: Run the UI contract test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/inbox/InboxBroadcastMessage.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Run all focused broadcast checks**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run shared/broadcastMessage.test.ts convex/whatsappTemplatePresentation.test.ts convex/whatsappTemplateSendPayload.test.ts convex/broadcastChatContent.test.ts convex/chat/broadcastMessageMetadata.test.ts src/components/inbox/InboxBroadcastMessage.test.ts`

Expected: all focused tests PASS with no warnings.

- [ ] **Step 6: Run final static verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -b --pretty false`

Expected: exit code 0.

Run: `git diff --check`

Expected: exit code 0.

Run: `wc -l shared/broadcastMessage.ts convex/whatsappTemplatePresentation.ts convex/chat/broadcastMessageMetadata.ts src/components/inbox/InboxBroadcastMessage.tsx`

Expected: every new code file is below 300 lines.

- [ ] **Step 7: Commit the inbox presentation**

```bash
git add src/components/inbox/InboxBroadcastMessage.tsx src/components/inbox/InboxBroadcastMessage.test.ts src/components/inbox/InboxThreadMessages.tsx
git commit -m "Render broadcast messages distinctly in inbox"
```

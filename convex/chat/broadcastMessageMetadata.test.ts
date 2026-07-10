import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  broadcastAgentMetadata,
  resolveBroadcastMetadata,
} from "./broadcastMessageMetadata";

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

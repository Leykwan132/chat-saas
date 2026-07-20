import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const messageMutationFiles = [
  "./chat/inbox.ts",
  "./whatsappWebhook.ts",
  "./instagramWebhook.ts",
  "./messengerWebhook.ts",
  "./webWidget.ts",
  "./instagramSync.ts",
  "./messengerSync.ts",
  "./broadcastPool.ts",
  "./followUpPool.ts",
];

const stateMutationFiles = [
  "./conversations.ts",
  "./customers.ts",
  "./analyticsTopicRecords.ts",
];

const canonicalWriterFiles = [
  ...messageMutationFiles,
  "./whatsappSync.ts",
  ...stateMutationFiles,
  "./leadRouting/assign.ts",
  "./analyticsInsightRecords.ts",
];

test.each(messageMutationFiles)(
  "%s marks the earliest dirty message without scheduling projection work",
  (path) => {
    const writer = source(path);
    expect(writer).toContain("markConversationAnalyticsDirty");
    expect(writer).toContain("earliestDirtyMessageAt");
  },
);

test("WhatsApp history sync batches dirty requests through the action boundary", () => {
  const writer = source("./whatsappSync.ts");
  expect(writer).toContain("internal.analyticsDirtyRequest.request");
  expect(writer).toContain("earliestDirtyMessageAt");
  expect(writer).not.toContain("internal.analyticsRefreshRequest.request");
});

test.each(stateMutationFiles)(
  "%s marks state changes dirty without treating them as message deltas",
  (path) => {
    const writer = source(path);
    expect(writer).toContain("markConversationAnalyticsDirty");
  },
);

test("sentiment-only insight writes do not dirty conversation analytics", () => {
  const writer = source("./analyticsInsightRecords.ts");
  expect(writer).not.toContain("syncConversationAnalytics");
  expect(writer).not.toContain("markConversationAnalyticsDirty");
});

test("new-conversation lead routing relies on the canonical message writer", () => {
  const writer = source("./leadRouting/assign.ts");
  expect(writer).not.toContain("markConversationAnalyticsDirty");
});

test.each(canonicalWriterFiles)(
  "%s never runs either analytics rebuild or the projection worker directly",
  (path) => {
    const writer = source(path);
    expect(writer).not.toContain("syncConversationAnalytics");
    expect(writer).not.toContain("requestConversationAnalyticsRefresh");
    expect(writer).not.toContain("analyticsProjectionWorker");
  },
);

test("the dirty dispatcher is the only canonical scheduler and runs every 15 minutes", () => {
  const dispatcher = source("./analyticsDirtyDispatcher.ts");
  const crons = source("./crons.ts");
  expect(dispatcher).toContain("analyticsProjectionWorker.run");
  expect(crons).toContain('"dispatch dirty conversation analytics"');
  expect(crons).toContain("{ minutes: 15 }");
});

test("cutover helpers do not request legacy refreshes", () => {
  const dispatcher = source("./analyticsDirtyDispatcher.ts");
  expect(dispatcher).not.toContain("requestConversationAnalyticsRefresh");
});

import { readFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import { createProjectionFixture } from "./analyticsProjection.testUtils";

afterEach(() => {
  vi.useRealTimers();
});

async function metricSnapshot(
  fixture: Awaited<ReturnType<typeof createProjectionFixture>>,
) {
  return (await fixture.metricRows())
    .map((row) => ({
      namespace: row.namespace,
      sortKey: row.sortKey,
      value: row.value,
      metric: row.metric,
      sourceKey: row.sourceKey,
    }))
    .sort((first, second) =>
      first.sourceKey.localeCompare(second.sourceKey),
    );
}

test("message conversation and topic backfill operations are idempotent", async () => {
  vi.useFakeTimers();
  const fixture = await createProjectionFixture({
    assignedUserId: "member-1",
    tags: ["Converted"],
  });
  await fixture.insertMessage("incoming", 1100);
  await fixture.insertMessage("outgoing", 1200, "member-1");
  const topicId = await fixture.insertTopic("billing");
  await fixture.replaceAssignments([
    { topicId, rank: 0, detectedAt: 1300 },
  ]);

  await fixture.t.mutation(
    internal.analyticsProjectionRepair.repairConversation,
    { conversationId: fixture.conversationId },
  );
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  const first = await metricSnapshot(fixture);

  await fixture.t.mutation(
    internal.analyticsProjectionRepair.repairConversation,
    { conversationId: fixture.conversationId },
  );
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await metricSnapshot(fixture)).toEqual(first);
});

test("migration schedules trigger-wrapped bounded repairs in batches of ten", () => {
  const migration = readFileSync(
    new URL("./analyticsProjectionMigration.ts", import.meta.url),
    "utf8",
  );
  expect(migration).toContain('table: "conversations"');
  expect(migration).toContain("batchSize: 10");
  expect(migration).toContain(
    "internal.analyticsProjectionRepair.repairConversation",
  );
  expect(migration).toContain("runBackfillAnalyticsV2");
});

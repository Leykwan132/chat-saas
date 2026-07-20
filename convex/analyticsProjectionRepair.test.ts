import { afterEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import { createProjectionFixture } from "./analyticsProjection.testUtils";

afterEach(() => {
  vi.useRealTimers();
});

async function contributionSnapshot(
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

test("repair pages 123 messages by 50 and remains idempotent", async () => {
  vi.useFakeTimers();
  const fixture = await createProjectionFixture({
    assignedUserId: "member-1",
  });
  for (let index = 0; index < 123; index += 1) {
    await fixture.insertMessage(
      "outgoing",
      2000 + index,
      "member-1",
    );
  }

  const firstPage = await fixture.t.mutation(
    internal.analyticsProjectionRepair.repairConversation,
    { conversationId: fixture.conversationId },
  );
  expect(firstPage).toEqual({
    repaired: false,
    scheduled: true,
    projectedMessages: 50,
  });
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await fixture.metricRows("messageSentCount")).toHaveLength(123);
  const firstSnapshot = await contributionSnapshot(fixture);

  await fixture.t.mutation(
    internal.analyticsProjectionRepair.repairConversation,
    { conversationId: fixture.conversationId },
  );
  await fixture.t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await contributionSnapshot(fixture)).toEqual(firstSnapshot);
});

test("repair without messages reconciles bounded state and topics immediately", async () => {
  const fixture = await createProjectionFixture();
  expect(
    await fixture.t.mutation(
      internal.analyticsProjectionRepair.repairConversation,
      { conversationId: fixture.conversationId },
    ),
  ).toEqual({
    repaired: true,
    scheduled: false,
    projectedMessages: 0,
  });
  expect(
    await fixture.metricBySourceRole("team:conversationCount"),
  ).toMatchObject({ value: 1 });
});

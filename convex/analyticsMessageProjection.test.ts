import { expect, test } from "vitest";
import { projectConversationMessagePage } from "./analyticsMessageProjection";
import {
  createProjectionFixture,
  type AnalyticsProjectionFixture,
} from "./analyticsProjectionTestUtils";

async function runMessageProjectionPage(
  fixture: AnalyticsProjectionFixture,
  earliestDirtyMessageAt: number,
  cursor: string | null = null,
) {
  return await fixture.t.run(async (ctx) =>
    await projectConversationMessagePage(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt,
      cursor,
    }),
  );
}

test("projects exactly 50 messages before continuing", async () => {
  const fixture = await createProjectionFixture();
  for (let index = 0; index < 52; index += 1) {
    await fixture.insertMessage(
      index === 0 ? "incoming" : "outgoing",
      1000 + index,
      index === 0 ? undefined : "member-1",
    );
  }

  const first = await runMessageProjectionPage(fixture, 1000);
  expect(first.projectedMessages).toBe(50);
  expect(first.isDone).toBe(false);

  const second = await runMessageProjectionPage(
    fixture,
    1000,
    first.continueCursor,
  );
  expect(second.projectedMessages).toBe(2);
  expect(second.isDone).toBe(true);
  expect(await fixture.metricRows("messageSentCount")).toHaveLength(51);
});

test("late earlier replies replace minimum-time state without duplicates", async () => {
  const fixture = await createProjectionFixture();
  await fixture.insertMessage("incoming", 1000);
  await fixture.insertMessage("outgoing", 1600, "member-1");
  await runMessageProjectionPage(fixture, 1000);
  await fixture.insertMessage("outgoing", 1200, "member-2");
  await runMessageProjectionPage(fixture, 1200);
  await fixture.runConversationProjection();

  expect(
    (await fixture.metricBySourceRole("team:firstReplyDurationMs")).value,
  ).toBe(200);
  expect(
    (
      await fixture.metricBySourceRole(
        "member:firstHumanReplyDurationMs",
      )
    ).value,
  ).toBe(200);
  expect(await fixture.metricRows("firstReplyDurationMs")).toHaveLength(1);
  expect(
    await fixture.metricRows("firstHumanReplyDurationMs"),
  ).toHaveLength(1);
});

test("messages after the first 500 remain projectable", async () => {
  const fixture = await createProjectionFixture();
  for (let index = 0; index < 501; index += 1) {
    await fixture.insertMessage(
      index === 0 ? "incoming" : "outgoing",
      1000 + index,
      index === 0 ? undefined : "member-1",
    );
  }
  const latestId = await fixture.insertMessage(
    "outgoing",
    2000,
    "member-1",
  );
  await runMessageProjectionPage(fixture, 2000);
  expect(
    await fixture.t.run(async (ctx) =>
      await ctx.db
        .query("analyticsMetricEntries")
        .withIndex("by_sourceKey", (query) =>
          query.eq(
            "sourceKey",
            `v2:message:${latestId}:member:messageSentCount`,
          ),
        )
        .unique(),
    ),
  ).not.toBeNull();
});

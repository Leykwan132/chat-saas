import { expect, test } from "vitest";
import {
  createProjectionFixture,
  type AnalyticsProjectionFixture,
} from "./analyticsProjectionTestUtils";

async function insertReplyState(fixture: AnalyticsProjectionFixture) {
  const firstHumanMessageId = await fixture.insertMessage(
    "outgoing",
    1500,
    "member-1",
  );
  await fixture.t.run(async (ctx) => {
    await ctx.db.insert("conversationAnalyticsProjectionStates", {
      conversationId: fixture.conversationId,
      firstCustomerMessageAt: 1000,
      firstOutgoingAt: 1400,
      firstHumanOutgoingAt: 1500,
      firstHumanMessageId,
      firstHumanMemberUserId: "member-1",
      createdAt: 1000,
      updatedAt: 1500,
    });
  });
}

test("assignment moves stable member contributions between namespaces", async () => {
  const fixture = await createProjectionFixture({
    assignedUserId: "member-1",
  });
  await fixture.runConversationProjection();
  const before = await fixture.metricBySourceRole(
    "member:assignedConversationCount",
  );
  await fixture.patchConversation({ assignedUserId: "member-2" });
  await fixture.runConversationProjection();
  const after = await fixture.metricBySourceRole(
    "member:assignedConversationCount",
  );
  expect(after.sourceKey).toBe(before.sourceKey);
  expect(after.sourceKey).not.toContain("member-2");
  expect(after.namespace).toContain(":member-2:");
});

test("close and reopen remove and recreate active contributions", async () => {
  const fixture = await createProjectionFixture({ status: "open" });
  await fixture.runConversationProjection();
  await fixture.patchConversation({ status: "closed" });
  await fixture.runConversationProjection();
  expect(
    await fixture.metricBySourceRoleOrNull("team:activeConversationCount"),
  ).toBeNull();
  await fixture.patchConversation({ status: "open" });
  await fixture.runConversationProjection();
  expect(
    await fixture.metricBySourceRoleOrNull("team:activeConversationCount"),
  ).not.toBeNull();
});

test("converted and Cold reversals remove derived rows", async () => {
  const fixture = await createProjectionFixture({
    tags: ["converted"],
    leadTemperature: "Cold",
  });
  await fixture.runConversationProjection(2000);
  await fixture.patchConversation({ tags: [] });
  await fixture.patchCustomer({ leadTemperature: "Warm" });
  await fixture.runConversationProjection(3000);
  expect(
    await fixture.metricBySourceRoleOrNull("team:convertedCount"),
  ).toBeNull();
  expect(
    await fixture.metricBySourceRoleOrNull("team:conversionDurationMs"),
  ).toBeNull();
  expect(
    await fixture.metricBySourceRoleOrNull("team:droppedCount"),
  ).toBeNull();
});

test("fixed contributions preserve v1 metric values and stay idempotent", async () => {
  const fixture = await createProjectionFixture({
    assignedUserId: "member-1",
    tags: ["converted"],
    leadTemperature: "Cold",
  });
  await insertReplyState(fixture);
  await fixture.runConversationProjection(2000);
  const firstSnapshot = (await fixture.metricRows())
    .map((row) => ({
      sourceKey: row.sourceKey,
      namespace: row.namespace,
      sortKey: row.sortKey,
      value: row.value,
    }))
    .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));
  await fixture.runConversationProjection(2500);
  const secondSnapshot = (await fixture.metricRows())
    .map((row) => ({
      sourceKey: row.sourceKey,
      namespace: row.namespace,
      sortKey: row.sortKey,
      value: row.value,
    }))
    .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));

  expect(secondSnapshot).toEqual(firstSnapshot);
  expect(
    await fixture.metricBySourceRole("team:conversationCount"),
  ).toMatchObject({ metric: "conversationCount", sortKey: 1000, value: 1 });
  expect(
    await fixture.metricBySourceRole("service:conversationCount"),
  ).toMatchObject({ metric: "channelConversationCount", sortKey: 1000 });
  expect(
    await fixture.metricBySourceRole("channel:conversationCount"),
  ).toMatchObject({ metric: "channelConversationCount", sortKey: 1000 });
  expect(
    await fixture.metricBySourceRole(
      "member:avgMessagesPerConversationDenominator",
    ),
  ).toMatchObject({
    metric: "avgMessagesPerConversationDenominator",
    sortKey: 1000,
  });
  expect(
    await fixture.metricBySourceRole("team:firstReplyDurationMs"),
  ).toMatchObject({ sortKey: 1400, value: 400 });
  expect(
    await fixture.metricBySourceRole("member:firstHumanReplyDurationMs"),
  ).toMatchObject({ sortKey: 1500, value: 500 });
  expect(
    await fixture.metricBySourceRole("team:conversionDurationMs"),
  ).toMatchObject({ sortKey: 1000, value: 1000 });
  expect(
    await fixture.metricBySourceRole("team:droppedCount"),
  ).toMatchObject({ sortKey: 1000, value: 1 });
});

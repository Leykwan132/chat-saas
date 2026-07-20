import { expect, test } from "vitest";
import { createProjectionFixture } from "./analyticsProjection.testUtils";

test("topic add remove and reorder remain idempotent", async () => {
  const fixture = await createProjectionFixture();
  const pricing = await fixture.insertTopic("pricing");
  const delivery = await fixture.insertTopic("delivery");
  await fixture.replaceAssignments([
    { topicId: pricing, rank: 0, detectedAt: 1000 },
    { topicId: delivery, rank: 1, detectedAt: 1100 },
  ]);
  await fixture.runTopicProjection();
  await fixture.runTopicProjection();
  expect(await fixture.metricRows("topicMentionCount")).toHaveLength(2);
  await fixture.replaceAssignments([
    { topicId: pricing, rank: 1, detectedAt: 1000 },
  ]);
  await fixture.runTopicProjection();
  const rows = await fixture.metricRows("topicMentionCount");
  expect(rows).toHaveLength(1);
  expect(rows[0]?.topicId).toBe(pricing);
});

test("topic projection rejects assignments beyond the product limit", async () => {
  const fixture = await createProjectionFixture();
  const topicIds = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      fixture.insertTopic(`topic-${index}`),
    ),
  );
  await fixture.replaceAssignments(
    topicIds.map((topicId, index) => ({
      topicId,
      rank: index,
      detectedAt: 1000 + index,
    })),
  );
  await expect(fixture.runTopicProjection()).rejects.toThrow(
    "more than 5 topic assignments",
  );
});

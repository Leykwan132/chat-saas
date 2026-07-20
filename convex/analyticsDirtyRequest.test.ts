import { expect, test } from "vitest";
import { markConversationAnalyticsDirty } from "./analyticsDirtyRequest";
import { createProjectionFixture } from "./analyticsProjection.testUtils";

test("repeated message changes coalesce without postponing request", async () => {
  const fixture = await createProjectionFixture();
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1200,
      requestedAt: 2000,
    }),
  );
  await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 900,
      requestedAt: 2500,
    }),
  );
  const request = await fixture.t.run(async (ctx) =>
    await ctx.db.get(requestId),
  );
  expect(request).toMatchObject({
    revision: 2,
    requestedAt: 2500,
    nextAttemptAt: 2000,
    earliestDirtyMessageAt: 900,
  });
});

test("state-only changes preserve existing message lower bound", async () => {
  const fixture = await createProjectionFixture();
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      earliestDirtyMessageAt: 1000,
      requestedAt: 2000,
    }),
  );
  await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      requestedAt: 3000,
    }),
  );
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toMatchObject({
      revision: 2,
      nextAttemptAt: 2000,
      earliestDirtyMessageAt: 1000,
    });
});

test("state-only first request is due immediately without message bound", async () => {
  const fixture = await createProjectionFixture();
  const requestId = await fixture.t.run(async (ctx) =>
    await markConversationAnalyticsDirty(ctx, {
      conversationId: fixture.conversationId,
      requestedAt: 4000,
    }),
  );
  expect(await fixture.t.run(async (ctx) => await ctx.db.get(requestId)))
    .toMatchObject({
      revision: 1,
      requestedAt: 4000,
      nextAttemptAt: 4000,
    });
});

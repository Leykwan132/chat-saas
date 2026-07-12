import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { parseAdvancedAnalyticsCronUtc } from "./analyticsCronSchedule";

function source(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

test("daily advanced analytics uses one structured model request", () => {
  const action = source("./analyticsInsights.ts");
  expect(action.match(/generateObject\(/g)).toHaveLength(1);
  expect(action).toContain("analyticsInsightsSchema");
  expect(action).toContain("captureAIGeneration");
  expect(action).toContain("assignConversationTopic");
  expect(action).toContain("internalSetLeadTemperature");
  expect(action).toContain("assignConversationInsights");
});

test("advanced analytics uses a dedicated serial workpool", () => {
  const pool = source("./analyticsInsightsPool.ts");
  const config = source("./convex.config.ts");
  const action = source("./analyticsInsights.ts");

  expect(pool).toContain("components.advancedAnalyticsWorkpool");
  expect(pool).toContain("maxParallelism: 1");
  expect(config).toContain('name: "advancedAnalyticsWorkpool"');
  expect(action).toContain("advancedAnalyticsPool.enqueueAction");
  expect(action).toContain("retry: true");
});

test("advanced analytics has one configurable daily cron", () => {
  const crons = source("./crons.ts");
  expect(crons).toContain('"combined advanced analytics"');
  expect(crons).toContain("advancedAnalyticsCronSchedule");
  expect(crons).not.toContain("conversation topic detection");
  expect(crons).not.toContain("conversation sentiment analysis");
});

test("advanced analytics cron time uses strict UTC HH:MM configuration", () => {
  expect(parseAdvancedAnalyticsCronUtc("18:00")).toEqual({
    hourUTC: 18,
    minuteUTC: 0,
  });
  expect(parseAdvancedAnalyticsCronUtc("03:45")).toEqual({
    hourUTC: 3,
    minuteUTC: 45,
  });
  expect(() => parseAdvancedAnalyticsCronUtc(undefined)).toThrow(
    "ADVANCED_ANALYTICS_CRON_UTC is required",
  );
  expect(() => parseAdvancedAnalyticsCronUtc("24:00")).toThrow(
    "ADVANCED_ANALYTICS_CRON_UTC must use HH:MM UTC",
  );
});

test("advanced analytics emits structured lifecycle logs without transcript content", () => {
  const action = source("./analyticsInsights.ts");
  expect(action).toContain('event: "cron_started"');
  expect(action).toContain('event: "jobs_enqueued"');
  expect(action).toContain('event: "worker_started"');
  expect(action).toContain('event: "worker_skipped"');
  expect(action).toContain('event: "worker_completed"');
  expect(action).toContain('event: "worker_failed"');
  expect(action).not.toContain("content: message.content");
});

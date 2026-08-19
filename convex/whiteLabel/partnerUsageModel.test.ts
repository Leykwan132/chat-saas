import { expect, test } from "vitest";
import { addPartnerUsage } from "./partnerUsageModel";

test("adds token and dollar usage without rounding away provider cost", () => {
  expect(addPartnerUsage({ totalTokens: 120, totalCostUsd: 0.25, requestCount: 3 }, { totalTokens: 80, costUsd: 0.0000012 })).toEqual({
    totalTokens: 200,
    totalCostUsd: 0.2500012,
    requestCount: 4,
  });
});

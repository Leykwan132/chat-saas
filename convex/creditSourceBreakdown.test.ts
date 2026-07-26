import { expect, test } from "vitest";
import { summarizeTopUpEntries } from "./creditSourceBreakdown";

test("separates referral credits from purchased and manual credits", () => {
  expect(
    summarizeTopUpEntries([
      {
        source: "purchase",
        grantedCredits: 2000,
        usedCredits: 500,
      },
      {
        source: "referral",
        grantedCredits: 1000,
        usedCredits: 200,
      },
      {
        source: "manual",
        grantedCredits: 300,
        usedCredits: 100,
      },
    ]),
  ).toEqual({
    totalRemaining: 2500,
    totalGranted: 3300,
    additionalRemaining: 1700,
    additionalGranted: 2300,
    referralRemaining: 800,
    referralGranted: 1000,
  });
});

test("classifies legacy entries without a source as additional credits", () => {
  expect(
    summarizeTopUpEntries([
      {
        grantedCredits: 500,
        usedCredits: 125,
      },
    ]),
  ).toEqual({
    totalRemaining: 375,
    totalGranted: 500,
    additionalRemaining: 375,
    additionalGranted: 500,
    referralRemaining: 0,
    referralGranted: 0,
  });
});

import { describe, expect, test } from "vitest";
import { parseReferralProgramConfig } from "./referralProgramConfig";

describe("referral program configuration", () => {
  test("parses positive safe integer reward and referral limit values", () => {
    expect(
      parseReferralProgramConfig({
        REFERRAL_REWARD_CREDITS: "1000",
        REFERRAL_MAX_SUCCESSFUL_REFERRALS: "10",
      }),
    ).toEqual({
      rewardCredits: 1000,
      maxSuccessfulReferrals: 10,
      maximumEarningPotential: 10000,
    });
  });

  test.each([
    [{}, "REFERRAL_REWARD_CREDITS"],
    [
      {
        REFERRAL_REWARD_CREDITS: "0",
        REFERRAL_MAX_SUCCESSFUL_REFERRALS: "10",
      },
      "REFERRAL_REWARD_CREDITS",
    ],
    [
      {
        REFERRAL_REWARD_CREDITS: "1.5",
        REFERRAL_MAX_SUCCESSFUL_REFERRALS: "10",
      },
      "REFERRAL_REWARD_CREDITS",
    ],
    [
      {
        REFERRAL_REWARD_CREDITS: "1000",
        REFERRAL_MAX_SUCCESSFUL_REFERRALS: "-1",
      },
      "REFERRAL_MAX_SUCCESSFUL_REFERRALS",
    ],
  ])("rejects invalid required values", (environment, expectedName) => {
    expect(() => parseReferralProgramConfig(environment)).toThrow(expectedName);
  });

  test("rejects a maximum earning potential outside the safe integer range", () => {
    expect(() =>
      parseReferralProgramConfig({
        REFERRAL_REWARD_CREDITS: String(Number.MAX_SAFE_INTEGER),
        REFERRAL_MAX_SUCCESSFUL_REFERRALS: "2",
      }),
    ).toThrow("maximum earning potential");
  });
});

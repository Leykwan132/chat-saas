import { describe, expect, test } from "vitest";
import { describeMessagingLimitTier } from "./whatsappMessagingLimit";

describe("describeMessagingLimitTier", () => {
  test("turns Meta TIER_250 into a readable limit", () => {
    expect(describeMessagingLimitTier("TIER_250")).toEqual({
      tier: "TIER_250",
      displayLabel: "250",
      conversationLimit: 250,
    });
  });

  test("turns Meta K tiers into readable numbers", () => {
    expect(describeMessagingLimitTier("TIER_2K")).toEqual({
      tier: "TIER_2K",
      displayLabel: "2,000",
      conversationLimit: 2000,
    });
  });

  test("shows unknown tiers as unknown instead of raw Meta values", () => {
    expect(describeMessagingLimitTier("TIER_CUSTOM")).toEqual({
      tier: "TIER_CUSTOM",
      displayLabel: "Unknown",
      conversationLimit: null,
    });
  });
});

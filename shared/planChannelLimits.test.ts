import { expect, test } from "vitest";
import {
  ALL_CHANNELS_HOVER_DESCRIPTION,
  ALL_CHANNELS_LABEL,
  getAlignedPlanFeatureRows,
  getChannelsHoverDescription,
  getPlanComparisonRows,
  LIMITED_CHANNELS_HOVER_DESCRIPTION,
  LIMITED_CHANNELS_LABEL,
  PLAN_CATALOG,
  PLAN_ORDER,
} from "./planCatalog";

test("free lists limited channels; only starter lists all channels as the paid upgrade", () => {
  expect(PLAN_CATALOG.free.maxChannels).toBe(1);
  expect(PLAN_CATALOG.free.displayFeatures).toContain(LIMITED_CHANNELS_LABEL);

  for (const planId of PLAN_ORDER) {
    if (planId === "free") continue;
    expect(PLAN_CATALOG[planId].maxChannels).toBe("unlimited");
  }

  expect(PLAN_CATALOG.starter.displayFeatures).toContain(ALL_CHANNELS_LABEL);
  expect(PLAN_CATALOG.growth.displayFeatures).not.toContain(ALL_CHANNELS_LABEL);
  expect(PLAN_CATALOG.business.displayFeatures).not.toContain(ALL_CHANNELS_LABEL);

  const channelRow = getPlanComparisonRows().find((row) => row.label === "Channels");
  expect(channelRow?.values.free).toBe("Limited");
  expect(channelRow?.values.starter).toBe("All");
  expect(channelRow?.values.growth).toBe("All");
  expect(channelRow?.values.business).toBe("All");

  const freeCard = getAlignedPlanFeatureRows("free").map((row) => row.text);
  const starterCard = getAlignedPlanFeatureRows("starter").map((row) => row.text);
  expect(freeCard).toContain(LIMITED_CHANNELS_LABEL);
  expect(starterCard).toContain(ALL_CHANNELS_LABEL);
});

test("channel hover copy emphasizes one platform vs all three per agent", () => {
  expect(getChannelsHoverDescription(LIMITED_CHANNELS_LABEL)).toBe(
    LIMITED_CHANNELS_HOVER_DESCRIPTION,
  );
  expect(getChannelsHoverDescription(ALL_CHANNELS_LABEL)).toBe(
    ALL_CHANNELS_HOVER_DESCRIPTION,
  );
  expect(LIMITED_CHANNELS_HOVER_DESCRIPTION).toMatch(/one platform only/i);
  expect(ALL_CHANNELS_HOVER_DESCRIPTION).toMatch(/all three platforms/i);
  expect(ALL_CHANNELS_HOVER_DESCRIPTION).toMatch(/every AI agent/i);
});

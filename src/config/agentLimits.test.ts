import { expect, test } from "vitest";
import { PLAN_CATALOG } from "../../shared/planCatalog";
import { UPGRADE_SCENARIOS } from "./upgradeScenarios";

test("plans expose the focused AI agent limits", () => {
  expect({
    free: PLAN_CATALOG.free.maxAgents,
    starter: PLAN_CATALOG.starter.maxAgents,
    growth: PLAN_CATALOG.growth.maxAgents,
    business: PLAN_CATALOG.business.maxAgents,
  }).toEqual({
    free: 1,
    starter: 2,
    growth: 5,
    business: 10,
  });
});

test("plans expose the approved prices and monthly credits", () => {
  expect({
    free: PLAN_CATALOG.free.monthlyCredits,
    starter: {
      priceMonthlyRm: PLAN_CATALOG.starter.priceMonthlyRm,
      priceAnnualRm: PLAN_CATALOG.starter.priceAnnualRm,
      monthlyCredits: PLAN_CATALOG.starter.monthlyCredits,
    },
    growth: {
      priceMonthlyRm: PLAN_CATALOG.growth.priceMonthlyRm,
      priceAnnualRm: PLAN_CATALOG.growth.priceAnnualRm,
      monthlyCredits: PLAN_CATALOG.growth.monthlyCredits,
    },
    business: {
      priceMonthlyRm: PLAN_CATALOG.business.priceMonthlyRm,
      priceAnnualRm: PLAN_CATALOG.business.priceAnnualRm,
      monthlyCredits: PLAN_CATALOG.business.monthlyCredits,
    },
  }).toEqual({
    free: 300,
    starter: { priceMonthlyRm: 79, priceAnnualRm: 760, monthlyCredits: 2000 },
    growth: { priceMonthlyRm: 299, priceAnnualRm: 2870, monthlyCredits: 8000 },
    business: { priceMonthlyRm: 499, priceAnnualRm: 5390, monthlyCredits: 20000 },
  });
});

test("upgrade scenarios advertise the focused AI agent limits", () => {
  expect(UPGRADE_SCENARIOS.free_to_starter.features).toContainEqual(
    expect.objectContaining({ title: "Up to 2 AI Agents" }),
  );
  expect(UPGRADE_SCENARIOS.starter_to_growth.features).toContainEqual(
    expect.objectContaining({ title: "Up to 5 AI Agents" }),
  );
  expect(UPGRADE_SCENARIOS.growth_to_business.features).toContainEqual(
    expect.objectContaining({ title: "Up to 10 AI Agents" }),
  );
});

test("upgrade scenarios advertise the approved monthly credits", () => {
  expect(UPGRADE_SCENARIOS.free_to_starter.features).toContainEqual(
    expect.objectContaining({ title: "2,000 Monthly Credits" }),
  );
  expect(UPGRADE_SCENARIOS.starter_to_growth.features).toContainEqual(
    expect.objectContaining({ title: "8,000 Monthly Credits" }),
  );
  expect(UPGRADE_SCENARIOS.growth_to_business.features).toContainEqual(
    expect.objectContaining({ title: "20,000 Monthly Credits" }),
  );
});

test("Starter upgrade copy advertises current advanced models", () => {
  const advancedModels = UPGRADE_SCENARIOS.free_to_starter.features.find(
    (feature) => feature.title === "Advanced AI Models",
  );

  expect(advancedModels?.description).toContain("GPT-5.6 Luna");
  expect(advancedModels?.description).toContain("GPT-OSS 120B");
  expect(advancedModels?.description).toContain("Nemotron");
  expect(advancedModels?.description).toContain("Qwen3.7 Flash");
  expect(advancedModels?.description).not.toContain("Gemini");
});

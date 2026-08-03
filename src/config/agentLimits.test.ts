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

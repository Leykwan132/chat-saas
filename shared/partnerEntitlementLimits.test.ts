import { expect, test } from "vitest";
import { PLAN_CATALOG } from "./planCatalog";
import {
  catalogMaxAgents,
  parsePartnerLimit,
  resolvePartnerAgentModel,
  resolvePartnerMaxAgents,
  resolvePartnerMonthlyCredits,
} from "./partnerEntitlementLimits";
import { DEFAULT_AGENT_MODEL } from "./agentModelDefaults";

test("partner limits fall back to the selected plan until an override is set", () => {
  expect(resolvePartnerMaxAgents("growth", undefined)).toBe(5);
  expect(resolvePartnerMaxAgents("free", 8)).toBe(8);
  expect(resolvePartnerMonthlyCredits("business", undefined)).toBe(
    PLAN_CATALOG.business.monthlyCredits,
  );
  expect(resolvePartnerMonthlyCredits("starter", 12500)).toBe(12500);
});

test("every partner plan exposes a numeric agent catalog default", () => {
  expect(catalogMaxAgents("free")).toBe(1);
  expect(catalogMaxAgents("starter")).toBe(2);
  expect(catalogMaxAgents("growth")).toBe(5);
  expect(catalogMaxAgents("business")).toBe(10);
});

test("rejects non-positive partner limit values", () => {
  expect(() => parsePartnerLimit(0, "Agents")).toThrow(
    "Agents must be a positive whole number.",
  );
  expect(() => parsePartnerLimit(1.5, "Monthly credits")).toThrow(
    "Monthly credits must be a positive whole number.",
  );
});

test("partner agent model falls back to the default until an override is set", () => {
  expect(resolvePartnerAgentModel(undefined)).toBe(DEFAULT_AGENT_MODEL);
  expect(resolvePartnerAgentModel("deepseek/deepseek-v4-flash")).toBe(
    "deepseek/deepseek-v4-flash",
  );
});

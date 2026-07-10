import { expect, test } from "vitest";
import { resolveAgentCostUsd } from "../agentCostAggregateModel";
import { calculateConfiguredModelCostUsd } from "./modelCost";

test("calculates Ilmu cost from input and output tokens", () => {
  expect(
    calculateConfiguredModelCostUsd("ilmu-mini-v3.3", {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    }),
  ).toBeCloseTo(1.4 / 4.7, 9);
});

test("returns null for models without configured token rates", () => {
  expect(
    calculateConfiguredModelCostUsd("amazon/nova-micro-v1", {
      promptTokens: 1_000,
      completionTokens: 1_000,
    }),
  ).toBeNull();
});

test("prefers provider-reported OpenRouter cost", () => {
  expect(
    resolveAgentCostUsd({
      model: "ilmu-mini-v3.3",
      providerMetadata: { openrouter: { usage: { cost: 0.5 } } },
      usage: { promptTokens: 1_000_000, completionTokens: 1_000_000 },
    }),
  ).toBe(0.5);
});

test("uses configured Ilmu cost when provider cost is absent", () => {
  expect(
    resolveAgentCostUsd({
      model: "ilmu-mini-v3.3",
      providerMetadata: undefined,
      usage: { promptTokens: 1_000_000, completionTokens: 1_000_000 },
    }),
  ).toBeCloseTo(1.4 / 4.7, 9);
});

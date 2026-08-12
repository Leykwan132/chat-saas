import { expect, test } from "vitest";
import { MODEL_PRICING, getModelPricing, listEnabledModels } from "./modelPricing";
import { PLAN_CATALOG } from "../planCatalog";
import { DEFAULT_AGENT_MODEL } from "../../shared/agentModelDefaults";

function plansWithModel(modelId: string) {
  return Object.entries(PLAN_CATALOG)
    .filter(([, plan]) => plan.models.includes(modelId))
    .map(([planKey]) => planKey);
}

test("enabled OpenRouter model ids never use free-tier variants", () => {
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);
  const catalogModelIds = Object.keys(MODEL_PRICING);
  const modelIds = [...new Set([...enabledModelIds, ...planModelIds, ...catalogModelIds])];

  expect(modelIds.filter((modelId) => modelId.endsWith(":free"))).toEqual([]);
});

test("retired models are unavailable and excluded from plan entitlements", () => {
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);

  for (const modelId of ["amazon/nova-micro-v1", "openai/gpt-oss-120b"]) {
    expect(getModelPricing(modelId)).toBeNull();
    expect(enabledModelIds).not.toContain(modelId);
    expect(planModelIds).not.toContain(modelId);
  }
});

test("Free plan includes only Ilmu Mini V3.3", () => {
  expect(PLAN_CATALOG.free.models).toEqual(["ilmu-mini-v3.3"]);

  const otherModels = listEnabledModels().filter(
    (model) => model.value !== "ilmu-mini-v3.3",
  );

  expect(otherModels.every((model) => model.requiredPlan !== "free")).toBe(true);
});

test("Ilmu Mini V3.3 is the default agent model", () => {
  expect(DEFAULT_AGENT_MODEL).toBe("ilmu-mini-v3.3");
  expect(listEnabledModels().some((model) => model.value === DEFAULT_AGENT_MODEL)).toBe(true);
});

test("Free plan grants and advertises 300 monthly credits", () => {
  expect(PLAN_CATALOG.free.monthlyCredits).toBe(300);
  expect(PLAN_CATALOG.free.displayFeatures).toContain("300 credits / mo");
  expect(PLAN_CATALOG.free.displayFeatures).not.toContain("50 credits / mo");
});

test("Google Gemma models are not enabled or included in plan entitlements", () => {
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);
  const catalogModelIds = Object.keys(MODEL_PRICING);

  expect(enabledModelIds).not.toContain("google/gemma-3-27b-it");
  expect(planModelIds).not.toContain("google/gemma-3-27b-it");
  expect(catalogModelIds).not.toContain("google/gemma-3-27b-it");
  expect(enabledModelIds).not.toContain("google/gemma-4-31b-it");
  expect(planModelIds).not.toContain("google/gemma-4-31b-it");
  expect(catalogModelIds).not.toContain("google/gemma-4-31b-it");
});

test("DeepSeek V4 Flash is the only popular model", () => {
  const popularModels = listEnabledModels().filter((entry) => entry.isPopular);
  const model = listEnabledModels().find((entry) => entry.value === "deepseek/deepseek-v4-flash");

  expect(model).toMatchObject({
    label: "DeepSeek V4 Flash",
    requiredPlan: "starter",
    labels: ["advanced", "popular"],
    isPopular: true,
  });
  expect(popularModels.map((entry) => entry.value)).toEqual(["deepseek/deepseek-v4-flash"]);
  expect(plansWithModel("deepseek/deepseek-v4-flash")).toEqual([
    "starter",
    "growth",
    "business",
  ]);
});

test("Ilmu Mini V3.3 is enabled for every plan", () => {
  const model = listEnabledModels().find((entry) => entry.value === "ilmu-mini-v3.3");

  expect(model).toMatchObject({
    label: "Ilmu Mini V3.3",
    provider: "ilmu",
    chef: "YTL AI Labs",
    chefSlug: "ilmu",
    requiredPlan: "free",
    labels: ["basic", "latest"],
    imageUrl: "https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png",
    inputCostMyrPerMillion: 0.2,
    outputCostMyrPerMillion: 1.2,
  });
  expect(plansWithModel("ilmu-mini-v3.3")).toEqual([
    "free",
    "starter",
    "growth",
    "business",
  ]);
});

test("models without custom metadata omit optional fields", () => {
  const model = listEnabledModels().find(
    (entry) => entry.value === "xiaomi/mimo-v2.5",
  );

  expect(model).not.toHaveProperty("imageUrl");
  expect(model).not.toHaveProperty("inputCostMyrPerMillion");
  expect(model).not.toHaveProperty("outputCostMyrPerMillion");
});

test("trimmed model options are not enabled or included in plan entitlements", () => {
  const removedModelIds = [
    "nvidia/nemotron-3-super-120b-a12b",
    "mistralai/mistral-nemo",
    "minimax/minimax-m3",
    "z-ai/glm-5.2",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen3.7-plus",
    "tencent/hy3-preview",
  ];
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);
  const catalogModelIds = Object.keys(MODEL_PRICING);

  for (const modelId of removedModelIds) {
    expect(enabledModelIds).not.toContain(modelId);
    expect(planModelIds).not.toContain(modelId);
    expect(catalogModelIds).not.toContain(modelId);
  }
});

test.each([
  ["openai/gpt-5.6-luna", "OpenAI GPT-5.6 Luna", "OpenAI", "openai"],
  ["nvidia/nemotron-3.5-lightning", "NVIDIA Nemotron 3.5 Lightning", "NVIDIA", "nvidia"],
  ["qwen/qwen3.7-flash", "Qwen3.7 Flash", "Qwen", "qwen"],
])("%s is enabled for every paid plan", (modelId, label, chef, chefSlug) => {
  const model = listEnabledModels().find((entry) => entry.value === modelId);

  expect(model).toMatchObject({
    label,
    creditCost: 1,
    provider: "openrouter",
    chef,
    chefSlug,
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  });
  expect(plansWithModel(modelId)).toEqual(["starter", "growth", "business"]);
});

test("Qwen models are not enabled or included in plan entitlements", () => {
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);
  const catalogModelIds = Object.keys(MODEL_PRICING);

  expect(enabledModelIds).not.toContain("qwen/qwen3-next-80b-a3b-instruct");
  expect(planModelIds).not.toContain("qwen/qwen3-next-80b-a3b-instruct");
  expect(catalogModelIds).not.toContain("qwen/qwen3-next-80b-a3b-instruct");
  expect(enabledModelIds).not.toContain("qwen/qwen3.7-plus");
  expect(planModelIds).not.toContain("qwen/qwen3.7-plus");
  expect(catalogModelIds).not.toContain("qwen/qwen3.7-plus");
});

test("GLM models are not enabled or included in plan entitlements", () => {
  const enabledModelIds = listEnabledModels().map((model) => model.value);
  const planModelIds = Object.values(PLAN_CATALOG).flatMap((plan) => plan.models);
  const catalogModelIds = Object.keys(MODEL_PRICING);

  expect(enabledModelIds).not.toContain("z-ai/glm-4.5-air");
  expect(planModelIds).not.toContain("z-ai/glm-4.5-air");
  expect(catalogModelIds).not.toContain("z-ai/glm-4.5-air");
  expect(enabledModelIds).not.toContain("z-ai/glm-5.2");
  expect(planModelIds).not.toContain("z-ai/glm-5.2");
  expect(catalogModelIds).not.toContain("z-ai/glm-5.2");
});

test("Xiaomi MiMo V2.5 is enabled and included in paid plan entitlements", () => {
  const model = listEnabledModels().find((entry) => entry.value === "xiaomi/mimo-v2.5");
  const plansWithModel = Object.entries(PLAN_CATALOG)
    .filter(([, plan]) => plan.models.includes("xiaomi/mimo-v2.5"))
    .map(([planKey]) => planKey);

  expect(model).toMatchObject({
    label: "Xiaomi MiMo V2.5",
    chef: "Xiaomi",
    chefSlug: "xiaomi",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  });
  expect(plansWithModel).toEqual(["starter", "growth", "business"]);
});

test("Google Gemini 3.1 Flash Lite is enabled and included in paid plan entitlements", () => {
  const model = listEnabledModels().find((entry) => entry.value === "google/gemini-3.1-flash-lite");
  const plansWithModel = Object.entries(PLAN_CATALOG)
    .filter(([, plan]) => plan.models.includes("google/gemini-3.1-flash-lite"))
    .map(([planKey]) => planKey);

  expect(model).toMatchObject({
    label: "Google Gemini 3.1 Flash Lite",
    chef: "Google",
    chefSlug: "google",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  });
  expect(plansWithModel).toEqual(["starter", "growth", "business"]);
});

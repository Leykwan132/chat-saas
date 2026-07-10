import { afterEach, expect, test } from "vitest";
import { resolveLanguageModel } from "./languageModel";

const originalIlmuApiKey = process.env.ILMU_API_KEY;

afterEach(() => {
  if (originalIlmuApiKey === undefined) {
    delete process.env.ILMU_API_KEY;
  } else {
    process.env.ILMU_API_KEY = originalIlmuApiKey;
  }
});

test("resolves Ilmu through the compatible provider", () => {
  process.env.ILMU_API_KEY = "test-ilmu-key";

  const resolved = resolveLanguageModel("ilmu-mini-v3.3");

  expect(resolved.provider).toBe("ilmu");
  expect(resolved.languageModel.modelId).toBe("ilmu-mini-v3.3");
});

test("throws when Ilmu credentials are missing", () => {
  delete process.env.ILMU_API_KEY;

  expect(() => resolveLanguageModel("ilmu-mini-v3.3")).toThrow(
    "ILMU_API_KEY is not configured",
  );
});

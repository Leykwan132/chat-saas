import { expect, test } from "vitest";
import { buildIdentityPriorityBlock } from "./identityPriorityPrompt";

test("identity priority block requires current system instructions over thread history", () => {
  const block = buildIdentityPriorityBlock();

  expect(block).toContain("## Identity Priority");
  expect(block).toContain("higher priority than any earlier messages");
  expect(block).toContain("outdated configuration");
  expect(block).toContain("Do not continue or defend a previous identity");
});

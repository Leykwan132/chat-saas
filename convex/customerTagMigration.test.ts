import { expect, test } from "vitest";
import { getCustomerTagBackfillInput } from "./customerTagMigration";

test("builds a personal workspace catalog input and excludes lead-temperature tags", () => {
  expect(getCustomerTagBackfillInput({
    orgId: "",
    userId: "personal-owner",
    tags: ["VIP", "Hot", "VIP"],
  })).toEqual({
    workspaceKey: "personal:personal-owner",
    tags: ["VIP"],
  });
});

test("does not assign ownerless personal customer tags to another workspace", () => {
  expect(getCustomerTagBackfillInput({
    orgId: "",
    tags: ["VIP"],
  })).toBeNull();
});

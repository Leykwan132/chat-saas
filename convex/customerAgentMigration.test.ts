import { expect, test } from "vitest";
import { getSafePersonalCustomerAgentPatch } from "./customerAgentMigration";

test("assigns a verified personal manual customer to its only personal agent", () => {
  expect(getSafePersonalCustomerAgentPatch({
    customer: {
      agentId: undefined,
      orgId: "",
      service: "manual",
      source: "manual",
      userId: "personal-owner",
    },
    personalAgentIds: ["agent-1"],
    now: 123,
  })).toEqual({ agentId: "agent-1", updatedAt: 123 });
});

test("leaves ownerless, non-manual, and ambiguous personal customers untouched", () => {
  expect(getSafePersonalCustomerAgentPatch({
    customer: {
      agentId: undefined,
      orgId: "",
      service: "manual",
      source: "manual",
      userId: undefined,
    },
    personalAgentIds: ["agent-1"],
    now: 123,
  })).toBeUndefined();
  expect(getSafePersonalCustomerAgentPatch({
    customer: {
      agentId: undefined,
      orgId: "",
      service: "manual",
      source: "manual",
      userId: "personal-owner",
    },
    personalAgentIds: ["agent-1", "agent-2"],
    now: 123,
  })).toBeUndefined();
  expect(getSafePersonalCustomerAgentPatch({
    customer: {
      agentId: undefined,
      orgId: "org-1",
      service: "manual",
      source: "manual",
      userId: "personal-owner",
    },
    personalAgentIds: ["agent-1"],
    now: 123,
  })).toBeUndefined();
});

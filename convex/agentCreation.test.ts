/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { DEFAULT_AGENT_MODEL } from "../shared/agentModelDefaults";

const modules = import.meta.glob("./**/*.ts");

function initTest() {
  const testInstance = convexTest(schema, modules);
  testInstance.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return testInstance;
}

describe("goal-based agent creation", () => {
  test("stores trimmed business context and builds the support prompt", async () => {
    const testInstance = initTest();
    const authed = testInstance.withIdentity({ subject: "goal-agent-owner" });
    const agentId = await authed.mutation(api.agents.create, {
      name: "  Nova  ",
      businessName: "  Northstar Dental  ",
      businessDescription: "  Family dental care.  ",
      goal: "support",
    });
    const agent = await authed.query(api.agents.get, { agentId });

    expect(agent).toMatchObject({
      name: "Nova",
      businessName: "Northstar Dental",
      businessDescription: "Family dental care.",
      goal: "support",
      templateKey: "support",
      model: DEFAULT_AGENT_MODEL,
    });
    expect(agent?.systemPrompt).toContain("Northstar Dental");
    expect(agent?.systemPrompt).toContain("customer support AI agent");
  });

  test("omits a blank description and maps booking to sales compatibility", async () => {
    const testInstance = initTest();
    const authed = testInstance.withIdentity({ subject: "booking-agent-owner" });
    const agentId = await authed.mutation(api.agents.create, {
      name: "Booking Assistant",
      businessName: "Glow Studio",
      businessDescription: "   ",
      goal: "bookService",
    });
    const agent = await authed.query(api.agents.get, { agentId });

    expect(agent?.businessDescription).toBeUndefined();
    expect(agent?.goal).toBe("bookService");
    expect(agent?.templateKey).toBe("sales");
    expect(agent?.systemPrompt).toContain("Do not claim a booking is confirmed");
  });

  test("rejects an empty business name", async () => {
    const testInstance = initTest();
    const authed = testInstance.withIdentity({ subject: "invalid-business-owner" });

    await expect(
      authed.mutation(api.agents.create, {
        name: "Support",
        businessName: "   ",
        goal: "support",
      }),
    ).rejects.toThrow("Business name is required");
  });
});

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

function initTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  return t;
}

test("agents.create maps support goals to the support template key", async () => {
  const t = initTest();
  const authed = t.withIdentity({
    subject: "user-agent-support-goal",
    email: "support-goal@example.com",
  });

  const agentId = await authed.mutation(api.agents.create, {
    name: "Support Agent",
    businessName: "Support Business",
    goal: "support",
  });

  const agent = await authed.query(api.agents.get, { agentId });
  expect(agent?.templateKey).toBe("support");
});

test("agents.create maps booking goals to the sales template key", async () => {
  const t = initTest();
  const authed = t.withIdentity({
    subject: "user-agent-booking-goal",
    email: "booking-goal@example.com",
  });

  const agentId = await authed.mutation(api.agents.create, {
    name: "Booking Agent",
    businessName: "Booking Business",
    goal: "bookService",
  });

  const agent = await authed.query(api.agents.get, { agentId });
  expect(agent?.templateKey).toBe("sales");
});

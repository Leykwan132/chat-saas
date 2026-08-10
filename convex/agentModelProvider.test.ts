/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";

const modules = import.meta.glob("./**/*.ts");

test("agents.create uses the shared default model and provider", async () => {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, {
    public: () => import("../node_modules/@convex-dev/stripe/dist/component/public.js"),
    private: () => import("../node_modules/@convex-dev/stripe/dist/component/private.js"),
    "_generated/server": () =>
      import("../node_modules/@convex-dev/stripe/dist/component/_generated/server.js"),
  });
  const authed = t.withIdentity({
    subject: "user-agent-ilmu-default",
    email: "ilmu-default@example.com",
  });

  const agentId = await authed.mutation(api.agents.create, {
    name: "Default Ilmu Agent",
    businessName: "Default Business",
    businessDescription: "Example business services",
    goal: "support",
  });

  const agent = await authed.query(api.agents.get, { agentId });
  expect(agent).toMatchObject({
    model: "ilmu-mini-v3.3",
    provider: "ilmu",
  });
});

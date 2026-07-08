/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { AGENT_PROMPT_TEMPLATES } from "../shared/agentPromptTemplates";
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

test("agents.create accepts the product sales template key", async () => {
  const t = initTest();
  const authed = t.withIdentity({
    subject: "user-agent-product-sales-template",
    email: "product-sales-template@example.com",
  });

  const agentId = await authed.mutation(api.agents.create, {
    name: "Product Sales Agent",
    templateKey: "productSales",
  });

  const agent = await authed.query(api.agents.get, { agentId });
  expect(agent?.templateKey).toBe("productSales");
  expect(agent?.systemPrompt).toBe(AGENT_PROMPT_TEMPLATES.productSales);
});

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { customerSearchText } from "./customerSearch";

const modules = import.meta.glob("./**/*.ts");

test("normalizes every customer identity field into searchable text", () => {
  expect(customerSearchText({
    name: "  Jessica Lee ",
    email: "JESSICA@EXAMPLE.COM",
    phone: "+60 12-345 6789",
    contactAddress: "wa:60123456789",
  })).toBe("jessica lee jessica@example.com +60 12-345 6789 wa:60123456789");
});

test("manual customer creation writes the search projection atomically", async () => {
  const t = convexTest(schema, modules);
  const workosUserId = "customer-search-writer";
  await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      workosUserId,
      email: "writer@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      type: "personal",
      name: "Personal",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { activeTeamId: teamId, updatedAt: now });
  });
  const authed = t.withIdentity({ subject: workosUserId });

  const customerId = await authed.mutation(api.customers.addManually, {
    name: "Jessica Writer",
    email: "Writer@Example.com",
    phone: "+60129999999",
  });

  const customer = await t.run(async (ctx) => await ctx.db.get(customerId));
  expect(customer?.searchText).toBe(
    "jessica writer writer@example.com +60129999999",
  );
});

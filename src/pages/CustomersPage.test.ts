import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(new URL("./CustomersPage.tsx", import.meta.url), "utf8");

test("customers table starts with one visible page and no assignee column", () => {
  expect(source).toContain("{ initialNumItems: 10 }");
  expect(source).toContain("['Customer', 'Source', 'Tags', 'Phone', 'Last Active']");
  expect(source).not.toContain("Rows per page");
  expect(source).not.toContain("customer.assignedUserId");
});

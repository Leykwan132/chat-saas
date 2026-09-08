import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { DEFAULT_ADMIN_FEATURE_ACCESS } from "./teamAccessCatalog";
import {
  mapFeatureAccessToPermissions,
  Permission,
  resolvePermissionsForRole,
} from "./permissions";

test("admin role receives agent-create by default", () => {
  expect(
    mapFeatureAccessToPermissions("admin", DEFAULT_ADMIN_FEATURE_ACCESS),
  ).toContain(Permission.AGENTS_CREATE);
  expect(
    resolvePermissionsForRole("admin", [Permission.AGENTS_MANAGE]),
  ).toContain(Permission.AGENTS_CREATE);
});

test("roles panel no longer reserves agent-create for owners only", () => {
  const source = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../src/components/teams/TeamRolesAndPermissionsPanel.tsx",
    ),
    "utf8",
  );
  expect(source).not.toContain(
    "p === Permission.AGENTS_CREATE && role !== 'owner'",
  );
});

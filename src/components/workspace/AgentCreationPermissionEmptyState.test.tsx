import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AgentCreationPermissionEmptyState } from "./AgentCreationPermissionEmptyState";

test("explains why members cannot create an agent", () => {
  const markup = renderToStaticMarkup(<AgentCreationPermissionEmptyState />);

  expect(markup).toContain("You don’t have permission to create agents");
  expect(markup).toContain("Please contact your workspace admin to request access.");
  expect(markup).toContain('data-slot="empty"');
});

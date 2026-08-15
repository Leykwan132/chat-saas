import { expect, test } from "vitest";
import { getPersonalServiceAssignmentMigrationPatch } from "./serviceAvailabilityMigration";

test("repairs stale personal service assignees", () => {
  expect(getPersonalServiceAssignmentMigrationPatch({
    agentOrgId: "",
    ownerWorkosUserId: "personal-owner",
    assignedWorkosUserIds: ["former-org-member"],
    assignmentStrategy: "specific_user",
    specificWorkosUserId: "former-org-member",
    now: 123,
  })).toEqual({
    assignedWorkosUserIds: ["personal-owner"],
    specificWorkosUserId: "personal-owner",
    updatedAt: 123,
  });
});

test("does not rewrite current personal or organization service assignees", () => {
  expect(getPersonalServiceAssignmentMigrationPatch({
    agentOrgId: "personal",
    ownerWorkosUserId: "personal-owner",
    assignedWorkosUserIds: ["personal-owner"],
    assignmentStrategy: "specific_user",
    specificWorkosUserId: "personal-owner",
    now: 123,
  })).toBeUndefined();
  expect(getPersonalServiceAssignmentMigrationPatch({
    agentOrgId: "org-123",
    ownerWorkosUserId: "organization-owner",
    assignedWorkosUserIds: ["selected-organization-member"],
    assignmentStrategy: "specific_user",
    specificWorkosUserId: "selected-organization-member",
    now: 123,
  })).toBeUndefined();
});

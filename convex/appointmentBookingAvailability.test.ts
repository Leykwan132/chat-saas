import { expect, test } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { isAssignedToService } from "./appointmentBooking/availability";

const service = {
  assignedWorkosUserIds: ["selected-user"],
} as Doc<"appointmentServices">;

test("only considers teammates selected for a service", () => {
  expect(isAssignedToService(service, "selected-user")).toBe(true);
  expect(isAssignedToService(service, "unselected-user")).toBe(false);
});

test("keeps existing services bookable during the assignment migration", () => {
  expect(isAssignedToService({} as Doc<"appointmentServices">, "any-user")).toBe(true);
});

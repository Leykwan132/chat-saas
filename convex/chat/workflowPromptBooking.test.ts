import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildAvailabilityDateRule, buildBookingFlowBlock } from "./threads";
import { buildWorkflowRuntimeBlock } from "./workflowPrompt";

test("workflow runtime describes book appointment by services instead of goal", () => {
  const block = buildWorkflowRuntimeBlock({
    workflowId: "workflow-id" as Id<"workflows">,
    edges: [],
    nodes: [
      {
        nodeId: "booking-node-id" as Id<"workflowNodes">,
        kind: "bookAppointment",
        title: "Book appointment",
        goal: "Legacy booking goal should not steer this node.",
        incomingConditions: [
          {
            sourceNodeId: "source-id" as Id<"workflowNodes">,
            name: "Yes",
            detail: "If the customer wants to book one of the selected services.",
          },
        ],
        allowedServices: [
          {
            serviceId: "service-id" as Id<"appointmentServices">,
            name: "Showroom viewing",
            durationMinutes: 45,
            fields: [],
          },
        ],
        mediaAssets: [],
      },
    ],
  });

  expect(block).toContain("Name: Yes");
  expect(block).toContain("- Allowed Services:");
  expect(block).toContain("Showroom viewing");
  expect(block).not.toContain("- Goal:");
  expect(block).not.toContain("Legacy booking goal should not steer this node.");
});

test("booking flow chains a fully specified requested slot without progress chatter", () => {
  const block = buildBookingFlowBlock();

  expect(block).toContain("Do not narrate tool steps");
  expect(block).toContain("call `checkAvailability` immediately");
  expect(block).toContain("does not require a session");
  expect(block).toContain("counts as confirmation");
  expect(block).toContain("returns `readyForBooking: true`");
  expect(block).toContain("Do not ask for another confirmation");
});

test("booking flow uses the atomic batch tools for multiple exact requested times", () => {
  const block = buildBookingFlowBlock();

  expect(block).toContain("two or more exact appointment times");
  expect(block).toContain("`preferredTimesIso`");
  expect(block).toContain("report every unavailable time together");
  expect(block).toContain("`bookAppointments`");
  expect(block).toContain("`sendBatchBookingConfirmation`");
  expect(block).toContain('reply with only "System reported an error."');
  expect(block).toContain("`bookAppointment`");
  expect(block).toContain("`sendBookingConfirmation`");
  expect(block).toContain("`listCustomerBookings`");
  expect(block).toContain("every booking for this customer");
  expect(block).toContain("`beginBookingDetailsEdit` with that appointment's `bookingId`");
  expect(block).toContain("Never propose cancelling and recreating bookings as a workaround for an edit.");
});

test("booking flow reschedules through one updateBookingsDateTime call after listing bookings", () => {
  const block = buildBookingFlowBlock();

  expect(block).toContain("even just one, use `updateBookingsDateTime`");
  expect(block).toContain("Always call `listCustomerBookings` before `updateBookingsDateTime`");
  expect(block).toContain("For a single booking, pass a one-item `bookings` array");
  expect(block).toContain('bookingId: "calendar-event-id", startTimeIso: "2026-10-01T16:00:00+08:00"');
  expect(block).toContain('bookingId: "october-5-booking-id", startTimeIso: "2026-10-05T14:00:00+08:00"');
  expect(block).toContain("one concise message listing every updated appointment");
  expect(block).toContain("Never cancel and rebook to reschedule");
  expect(block).toContain("`beginBookingDetailsEdit` and `saveBookingDetails` never change a date or time");
  expect(block).not.toMatch(/`beginBookingEdit`|`updateBookingAppointment`/);
});

test("booking flow embeds the server current date for relative requests", () => {
  const block = buildBookingFlowBlock(
    "Asia/Kuala_Lumpur",
    new Date("2026-09-10T08:05:19.803Z"),
  );

  expect(block).toContain("Today's date is 2026-09-10");
  expect(block).toContain("Asia/Kuala_Lumpur");
  expect(block).toContain("Do not guess or use a different year");
  expect(block).toContain("1. 5:00 AM - 5:30 AM");
  expect(block).toContain("2. 3:00 PM - 3:30 PM");
});

test("availability date rule includes the generated current date", () => {
  expect(buildAvailabilityDateRule(
    "Asia/Kuala_Lumpur",
    new Date("2026-09-10T08:05:19.803Z"),
  )).toBe("The date must be today or later than 2026-09-10 in Asia/Kuala_Lumpur.");
});

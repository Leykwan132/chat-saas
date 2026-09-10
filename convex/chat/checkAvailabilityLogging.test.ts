import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(new URL("./threads.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const availabilitySource = readFileSync(
  fileURLToPath(new URL("../appointmentBooking/availability.ts", import.meta.url)),
  "utf8",
);
const rosterSource = readFileSync(
  fileURLToPath(new URL("../appointmentBooking/availabilityRoster.ts", import.meta.url)),
  "utf8",
);

test("availability tool logs its agent invocation before checking slots", () => {
  expect(source).toContain('"agent_tool_check_availability_invoked"');
  expect(source).toContain("sourceAgentMessageId");
});

test("availability diagnostics avoid per-candidate and roster row logs", () => {
  expect(availabilitySource).not.toContain('"booking_availability_candidate_available"');
  expect(availabilitySource).not.toContain('"booking_availability_candidate_rejected"');
  expect(availabilitySource).toContain("rejectionReasonCounts");
  expect(rosterSource).not.toContain('"booking_availability_schedule_rows"');
  expect(rosterSource).not.toContain('"booking_availability_calendar_result"');
});

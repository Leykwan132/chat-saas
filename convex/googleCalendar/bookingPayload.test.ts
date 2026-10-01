import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { pendingKilobotGoogleEventFields } from "./bookingPayload";
import { deriveGoogleCalendarEventId } from "./writeFingerprint";

test("agent booking stores the Google event id before the provider write", async () => {
  const operationKey = "booking:123:create";
  const fields = await pendingKilobotGoogleEventFields({
    ownerUserId: "user" as Id<"users">,
    operationKey,
  });
  expect(fields.externalEventId).toBe(await deriveGoogleCalendarEventId(operationKey));
  expect(fields.externalSyncState).toBe("pending");
  expect(fields.externalOrigin).toBe("kilobot");
});

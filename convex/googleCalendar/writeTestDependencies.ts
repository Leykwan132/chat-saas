import type { TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import { WORKOS_GOOGLE_CALENDAR_TOKEN_URL } from "./constants";
import type { GoogleCalendarWriteDependencies } from "./writeTypes";
import schema from "../schema";

const originalWorkOSApiKey = process.env.WORKOS_API_KEY;
process.env.WORKOS_API_KEY = originalWorkOSApiKey ?? "sk_test_google_calendar";

type CalendarTest = TestConvex<typeof schema>;
type MutationRef = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;

const stores = (internal as unknown as { googleCalendar: {
  writeStore: { prepare: MutationRef; beginAttempt: MutationRef };
  writeAttemptLeaseStore: {
    renewAttemptLease: MutationRef; claimMutationRecovery: MutationRef;
    recordRecoveryConflict: MutationRef;
    finishMutationRecovery: MutationRef;
  };
  writeFinalizationStore: {
    finalizeEvent: MutationRef; establishDeletePrecondition: MutationRef;
    finalizeDelete: MutationRef;
  };
  writeOutcomeStore: { recordOutcome: MutationRef };
} }).googleCalendar;

function withVendedAccessToken(googleFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method === "POST" && url === WORKOS_GOOGLE_CALENDAR_TOKEN_URL) {
      return Response.json({
        active: true,
        access_token: {
          object: "access_token",
          access_token: "ya29.test",
          scopes: [],
          missing_scopes: [],
        },
      });
    }
    return googleFetch(input, init);
  };
}

export function googleCalendarWriteTestDependencies(
  t: CalendarTest,
  fetchImplementation: typeof fetch,
  clock: () => number,
): GoogleCalendarWriteDependencies {
  return {
    prepare: (args) => t.mutation(stores.writeStore.prepare, args) as never,
    beginAttempt: (args) => t.mutation(stores.writeStore.beginAttempt, args) as never,
    renewAttemptLease: (args) => t.mutation(stores.writeAttemptLeaseStore.renewAttemptLease, args) as never,
    claimMutationRecovery: (args) => t.mutation(stores.writeAttemptLeaseStore.claimMutationRecovery, args) as never,
    finishMutationRecovery: (args) => t.mutation(stores.writeAttemptLeaseStore.finishMutationRecovery, args) as never,
    recordRecoveryConflict: (args) => t.mutation(stores.writeAttemptLeaseStore.recordRecoveryConflict, args) as never,
    finalizeEvent: (args) => t.mutation(stores.writeFinalizationStore.finalizeEvent, args) as never,
    establishDeletePrecondition: (args) => t.mutation(stores.writeFinalizationStore.establishDeletePrecondition, args) as never,
    finalizeDelete: (args) => t.mutation(stores.writeFinalizationStore.finalizeDelete, args) as never,
    recordOutcome: (args) => t.mutation(stores.writeOutcomeStore.recordOutcome, args) as never,
    getCredential: async () => ({ kind: "active", workosUserId: "user_google_calendar" }),
    refresh: async () => undefined,
    clock,
    fetchImplementation: withVendedAccessToken(fetchImplementation),
  };
}

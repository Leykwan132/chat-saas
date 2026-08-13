/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import {
  createUserAcrossTwoTeams,
  insertActiveAndPendingReplacement,
  insertSameGoogleEventForTwoOwnersAndTwoInstances,
  readConnection,
  readConnectionsForUser,
  readWriteOperationsByKey,
  reserveConnection,
  reserveWriteOperation,
} from "./googleCalendar/testFixtures";
import schema from "./schema";
import { GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX } from "./googleCalendar/constants";

const modules = import.meta.glob("./**/*.ts");

test("external event identity index name fits Convex identifier limits", () => {
  expect(GOOGLE_CALENDAR_EXTERNAL_EVENT_INDEX.length).toBeLessThanOrEqual(64);
});

test("one Google Calendar connection follows a user across workspaces", async () => {
  const t = convexTest(schema, modules);
  const { userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  const connection = await readConnection(t, userId);

  expect(connection?._id).toBe(connectionId);
  expect(connection?.userId).toBe(userId);
  expect(connection).not.toHaveProperty("teamId");
  expect(teamIds).toHaveLength(2);
});

test("connection reservation prevents duplicate user rows", async () => {
  const t = convexTest(schema, modules);
  const { userId } = await createUserAcrossTwoTeams(t);
  const firstConnectionId = await reserveConnection(t, userId);
  const secondConnectionId = await reserveConnection(t, userId);

  expect(secondConnectionId).toBe(firstConnectionId);
  expect(await readConnectionsForUser(t, userId)).toHaveLength(1);
});

test("connection reservation rejects a non-primary calendar", async () => {
  const t = convexTest(schema, modules);
  const { userId } = await createUserAcrossTwoTeams(t);

  await expect(reserveConnection(t, userId, "secondary")).rejects.toThrow();
});

test("write operation reservation prevents duplicate operation rows", async () => {
  const t = convexTest(schema, modules);
  const { userId } = await createUserAcrossTwoTeams(t);
  const connectionId = await reserveConnection(t, userId);
  const operationKey = "booking:123:create";
  const firstOperationId = await reserveWriteOperation(t, connectionId, operationKey);
  const secondOperationId = await reserveWriteOperation(t, connectionId, operationKey);

  expect(secondOperationId).toBe(firstOperationId);
  expect(await readWriteOperationsByKey(t, operationKey)).toHaveLength(1);
});

test("watch replacement channels overlap on one connection", async () => {
  const t = convexTest(schema, modules);
  const channels = await insertActiveAndPendingReplacement(t);

  expect(channels.map((row) => row.state)).toEqual(["active", "pending"]);
});

test("external event identity includes owner and recurring instance", async () => {
  const t = convexTest(schema, modules);
  const rows = await insertSameGoogleEventForTwoOwnersAndTwoInstances(t);
  const foundRows = rows.filter((row) => row !== null);

  expect(rows).toHaveLength(4);
  expect(foundRows).toHaveLength(4);
  expect(new Set(foundRows.map((row) => row.externalOwnerUserId)).size).toBe(2);
  expect(new Set(foundRows.map((row) => row.externalOriginalStartAt)).size).toBe(2);
});

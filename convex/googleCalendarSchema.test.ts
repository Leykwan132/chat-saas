/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import {
  createUserAcrossTwoTeams,
  insertActiveAndPendingReplacement,
  insertSameGoogleEventForTwoOwnersAndTwoInstances,
  readConnection,
} from "./googleCalendar/testFixtures";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("one Google Calendar connection follows a user across workspaces", async () => {
  const t = convexTest(schema, modules);
  const { connectionId, userId, teamIds } = await createUserAcrossTwoTeams(t);
  const connection = await readConnection(t, userId);

  expect(connection?._id).toBe(connectionId);
  expect(connection?.userId).toBe(userId);
  expect(connection).not.toHaveProperty("teamId");
  expect(teamIds).toHaveLength(2);
});

test("watch replacement channels overlap on one connection", async () => {
  const t = convexTest(schema, modules);
  const channels = await insertActiveAndPendingReplacement(t);

  expect(channels.map((row) => row.state)).toEqual(["active", "pending"]);
});

test("external event identity includes owner and recurring instance", async () => {
  const t = convexTest(schema, modules);
  const rows = await insertSameGoogleEventForTwoOwnersAndTwoInstances(t);

  expect(rows).toHaveLength(4);
  expect(new Set(rows.map((row) => row.externalOwnerUserId)).size).toBe(2);
  expect(new Set(rows.map((row) => row.externalOriginalStartAt)).size).toBe(2);
});

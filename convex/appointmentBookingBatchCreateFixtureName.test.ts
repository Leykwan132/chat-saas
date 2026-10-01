import { expect, test } from "vitest";

const testOnlyFixtures = import.meta.glob("./appointmentBookingBatchCreate.testFixture.ts");
const deployableFixtures = import.meta.glob("./appointmentBookingBatchCreateFixture.ts");

test("keeps the batch booking fixture out of Convex entry points", () => {
  expect(Object.keys(testOnlyFixtures)).toEqual(["./appointmentBookingBatchCreate.testFixture.ts"]);
  expect(Object.keys(deployableFixtures)).toEqual([]);
});

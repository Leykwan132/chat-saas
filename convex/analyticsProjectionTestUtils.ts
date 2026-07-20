/// <reference types="vite/client" />
import aggregateSchema from "../node_modules/@convex-dev/aggregate/dist/component/schema.js";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const mockAggregate = {
  public: () =>
    import("../node_modules/@convex-dev/aggregate/dist/component/public.js"),
  "_generated/server": () =>
    import(
      "../node_modules/@convex-dev/aggregate/dist/component/_generated/server.js"
    ),
};

export type AnalyticsProjectionTest = TestConvex<typeof schema>;

export function analyticsProjectionTest(): AnalyticsProjectionTest {
  const test = convexTest(schema, modules);
  test.registerComponent("analyticsMetrics", aggregateSchema, mockAggregate);
  return test;
}

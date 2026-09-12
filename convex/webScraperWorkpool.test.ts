import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const workpoolSource = readFileSync(
  new URL("./workpool.ts", import.meta.url),
  "utf8",
);

test("limits website research to one concurrent worker", () => {
  expect(workpoolSource).toMatch(
    /new Workpool\(components\.webScraperWorkpool, \{\s*maxParallelism: 1/,
  );
  expect(workpoolSource).not.toContain("linkDiscovererWorkpool");
});

test("does not add worker-side request delays", () => {
  expect(workpoolSource).not.toContain("runBrowserRenderingRequest");
});

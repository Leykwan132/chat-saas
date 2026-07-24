import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const workpoolSource = readFileSync(
  new URL("./workpool.ts", import.meta.url),
  "utf8",
);

test("limits each website scraping pool to one concurrent worker", () => {
  expect(workpoolSource).toMatch(
    /new Workpool\(components\.webScraperWorkpool, \{\s*maxParallelism: 1/,
  );
  expect(workpoolSource).toMatch(
    /new Workpool\(components\.linkDiscovererWorkpool, \{\s*maxParallelism: 1/,
  );
});

test("does not add worker-side request delays", () => {
  expect(workpoolSource).not.toContain("runBrowserRenderingRequest");
});

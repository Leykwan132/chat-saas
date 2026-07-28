import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const creditMeter = readFileSync(
  fileURLToPath(new URL("../components/CreditMeter.tsx", import.meta.url)),
  "utf8",
);
const progress = readFileSync(
  fileURLToPath(new URL("../components/ui/progress.tsx", import.meta.url)),
  "utf8",
);

test("credit meter uses one shared progress height for every balance row", () => {
  expect(creditMeter).toContain(
    "const METER_PROGRESS_CLASS = 'h-[4px] shrink-0';",
  );
  expect(creditMeter).toContain("METER_PROGRESS_CLASS");
  expect(creditMeter).not.toMatch(
    /Progress[\s\S]*className=\{cn\(\s*'h-/,
  );
});

test("progress root fills height without flex centering", () => {
  expect(progress).toContain(
    '"relative h-3 w-full overflow-hidden rounded-full bg-muted"',
  );
  expect(progress).toContain('className="h-full w-full flex-1 bg-primary transition-all"');
  expect(progress).not.toContain("items-center overflow-x-hidden");
  expect(progress).not.toContain("size-full flex-1");
});

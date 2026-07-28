import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(
  new URL("./ReferralsPage.tsx", import.meta.url),
);
const source = readFileSync(sourcePath, "utf8");

test("uses one soft referral panel with a code-only copy row", () => {
  const howItWorksIndex = source.indexOf(
    'aria-labelledby="referral-how-it-works-title"',
  );
  const referralCodeIndex = source.indexOf(
    'aria-labelledby="your-referral-code-title"',
  );

  expect(howItWorksIndex).toBeGreaterThan(-1);
  expect(referralCodeIndex).toBeGreaterThan(howItWorksIndex);
  expect(source).not.toContain('from "@/components/ui/card"');
  expect(source).not.toContain("<Progress");
  expect(source).not.toContain("Link2");
  expect(source).not.toContain("overview.historicalCreditsEarned");
  expect(source).not.toContain("overview.remainingPotentialCredits");
  expect(source).toContain(
    'className="flex flex-col gap-8 rounded-4xl bg-muted/30 p-6 sm:p-8"',
  );
  expect(source).toContain('className="h-10 sm:w-24"');
  expect(source).toContain('{copied ? "Copied" : "Copy"}');
  expect(source).toMatch(/<section\s+aria-labelledby="past-referrals-title"/);
  expect(source).toContain('<Empty className="flex-none bg-muted/30 px-6 py-10">');
  expect(source).toContain('<TableHead className="text-center">Email</TableHead>');
  expect(source).toContain('<TableHead className="text-center">Date</TableHead>');
  expect(source).toContain('<TableHead className="text-center">Earned</TableHead>');
  expect(source).toContain('className="text-center"');
  expect(source).toContain(
    'className="text-center font-medium tabular-nums"',
  );
  expect(source).toContain("toLocaleString()");
  expect(source).toContain(
    "+{referral.rewardCredits.toLocaleString()} credits",
  );
  expect(source).not.toContain("<TableHead>Person</TableHead>");
  expect(source).not.toContain("<TableHead>Completed</TableHead>");
  expect(source).not.toContain('text-right');
});

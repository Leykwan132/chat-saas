# Referral Page Borderless Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present referral instructions and the copyable code as compact flat sections matching the supplied invite-page reference, with referral history below.

**Architecture:** Keep the existing data-loading page and behavior intact. Change only its composition and presentation, using plain sections for instructions, code, and history with visual containment limited to the code field and Copy button.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, Vitest

## Global Constraints

- Preserve all referral queries, pagination, copying, capped-state behavior, and dynamic credit copy.
- Use existing semantic colors and shadcn components.
- Do not change shared UI primitives.
- Keep code files below 300 lines.
- Run scripts with Node 22.

---

### Task 1: Compose the borderless referral layout

**Files:**

- Create: `src/pages/ReferralsPageLayout.test.ts`
- Modify: `src/pages/ReferralsPage.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**

- Consumes: `api.referrals.getMyOverview`, `api.referrals.listMyReferralHistory`, and the existing shadcn Button, Empty, Table, and InputGroup components.
- Produces: The unchanged default `ReferralsPage` route component with a new responsive visual hierarchy.

- [ ] **Step 1: Write the failing structural test**

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const sourcePath = fileURLToPath(
  new URL("./ReferralsPage.tsx", import.meta.url),
);
const source = readFileSync(sourcePath, "utf8");

test("uses a simple flat how-it-works and referral-code flow", () => {
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
  expect(source).toMatch(/<section\\s+aria-labelledby="past-referrals-title"/);
  expect(source).toContain(
    '<Empty className="min-h-32 bg-muted/30 p-6">',
  );
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ReferralsPageLayout.test.ts
```

Expected: FAIL because the current page still renders a Card and places the code before the instructions.

- [ ] **Step 3: Implement the approved layout**

Update `ReferralsPage.tsx` so:

- One rounded `bg-muted/30` surface groups How it works and Your referral code for later media enhancement.
- How it works is the first section and uses three compact icon-and-text rows.
- Your referral code follows with a code-only field and separate equal-height text Copy button.
- Link treatment, Progress, Card presentation, and referral-count metadata are absent.
- Past referrals is a full-width semantic section below.
- The empty state uses `bg-muted/30`.
- The skeleton reflects the same compact vertical flow.

- [ ] **Step 4: Run focused and referral-related tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ReferralsPageLayout.test.ts src/lib/referralCode.test.ts src/lib/creditBalanceRows.test.ts
```

Expected: PASS.

- [ ] **Step 5: Verify TypeScript, file length, and diff quality**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
wc -l src/pages/ReferralsPage.tsx src/pages/ReferralsPageLayout.test.ts
git diff --check
```

Expected: all commands pass and both code files remain below 300 lines.

- [ ] **Step 6: Record the unreleased UI refinement**

Update `CONTINUITY.md` with the approved borderless page composition and verification receipts. Do not update the public changelog because the referral feature remains unreleased.

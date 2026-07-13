# Dashboard Support Hover Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-option support HoverCard beside dark mode in the authenticated dashboard and workspace headers.

**Architecture:** A reusable `SupportHoverCard` owns the controlled overlay, support destinations, and fully clickable Card links. `DashboardLayout` and `WorkspacePage` only place the component beside `ModeToggle`; public header components remain untouched.

**Tech Stack:** React 19, TypeScript 6, Radix-backed shadcn HoverCard/Card/Button, Lucide React, React Icons, Vitest, Tailwind CSS 4.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep every code file below 300 lines.
- Add no comments unless a non-obvious workaround cannot be made self-explanatory.
- Use the existing installed shadcn `HoverCard`, `Card`, and `Button` components.
- Use `MessageCircleQuestionMark` for the trigger and `SiWhatsapp` for WhatsApp support.
- Use exactly `https://forms.gle/Hoo56T7Qj3yEBEeZ9`, `https://wa.me/60129499394`, and `mailto:support@kilobot.app`.
- Render the control only in authenticated dashboard and workspace headers.
- Do not add backend calls, persistence, analytics, or fallback behavior.

---

## File Structure

- Create `src/components/SupportHoverCard.tsx`: controlled support overlay, option metadata, trigger, and Card links.
- Create `src/components/SupportHoverCard.test.ts`: focused source-level contract for destinations, link behavior, composition, icons, placement, and exclusions.
- Modify `src/layouts/DashboardLayout.tsx`: place `SupportHoverCard` immediately before `ModeToggle` in the desktop header action group.
- Modify `src/pages/WorkspacePage.tsx`: place the same component immediately before `ModeToggle` in the desktop header action group.
- Modify `CONTINUITY.md`: record implementation state and verification receipts after the code is green.

### Task 1: Authenticated Header Support Hover Card

**Files:**
- Create: `src/components/SupportHoverCard.test.ts`
- Create: `src/components/SupportHoverCard.tsx`
- Modify: `src/layouts/DashboardLayout.tsx`
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `Button`, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter`, `HoverCard`, `HoverCardTrigger`, and `HoverCardContent` from the existing UI component modules.
- Produces: `export function SupportHoverCard(): JSX.Element` with no props.

- [x] **Step 1: Write the failing source contract**

Create `src/components/SupportHoverCard.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function readSource(relativePath: string) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  return existsSync(sourceUrl) ? readFileSync(sourceUrl, 'utf8') : '';
}

const componentSource = readSource('./SupportHoverCard.tsx');
const dashboardSource = readSource('../layouts/DashboardLayout.tsx');
const workspaceSource = readSource('../pages/WorkspacePage.tsx');
const siteHeaderSource = readSource('./site-header/SiteHeaderActions.tsx');
const legalHeaderSource = readSource('./LegalDocumentLayout.tsx');
const blogHeaderSource = readSource('./BlogPostLayout.tsx');

test('offers the exact bug, WhatsApp, and email support destinations', () => {
  expect(componentSource).toContain('https://forms.gle/Hoo56T7Qj3yEBEeZ9');
  expect(componentSource).toContain('https://wa.me/60129499394');
  expect(componentSource).toContain('mailto:support@kilobot.app');
  expect(componentSource.match(/target: '_blank'/g)).toHaveLength(2);
  expect(componentSource.match(/rel: 'noreferrer'/g)).toHaveLength(2);
});

test('uses the requested icons and fully clickable three-card composition', () => {
  expect(componentSource).toContain('MessageCircleQuestionMark');
  expect(componentSource).toContain('SiWhatsapp');
  expect(componentSource).toContain('aria-label="Contact support"');
  expect(componentSource).toContain('grid grid-cols-3 gap-3');
  expect(componentSource).toContain('SUPPORT_OPTIONS.map');
  expect(componentSource).toContain('<a');
  expect(componentSource).toContain('<Card');
  expect(componentSource).toContain('onClick={() => setOpen(false)}');
});

test('places support before dark mode only in authenticated headers', () => {
  expect(dashboardSource).toContain("import { SupportHoverCard } from '@/components/SupportHoverCard'");
  expect(workspaceSource).toContain("import { SupportHoverCard } from '@/components/SupportHoverCard'");
  expect(dashboardSource.indexOf('<SupportHoverCard />')).toBeLessThan(
    dashboardSource.indexOf('<ModeToggle />'),
  );
  expect(workspaceSource.indexOf('<SupportHoverCard />')).toBeLessThan(
    workspaceSource.indexOf('<ModeToggle />'),
  );
  expect(siteHeaderSource).not.toContain('SupportHoverCard');
  expect(legalHeaderSource).not.toContain('SupportHoverCard');
  expect(blogHeaderSource).not.toContain('SupportHoverCard');
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SupportHoverCard.test.ts
```

Expected: three assertion failures because `SupportHoverCard.tsx` does not exist and the authenticated headers do not contain `SupportHoverCard`.

- [x] **Step 3: Add the minimal reusable component**

Create `src/components/SupportHoverCard.tsx`:

```tsx
import { useState } from 'react';
import { ArrowRight, Bug, Mail, MessageCircleQuestionMark } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

const SUPPORT_OPTIONS = [
  {
    title: 'Report a bug',
    description: 'Tell us what went wrong so we can investigate.',
    action: 'Open form',
    href: 'https://forms.gle/Hoo56T7Qj3yEBEeZ9',
    icon: Bug,
    target: '_blank',
    rel: 'noreferrer',
  },
  {
    title: 'WhatsApp support',
    description: 'Chat directly with the Kilobot support team.',
    action: 'Start chat',
    href: 'https://wa.me/60129499394',
    icon: SiWhatsapp,
    target: '_blank',
    rel: 'noreferrer',
  },
  {
    title: 'Email support',
    description: 'Send a detailed question to our support inbox.',
    action: 'Write email',
    href: 'mailto:support@kilobot.app',
    icon: Mail,
    target: undefined,
    rel: undefined,
  },
] as const;

export function SupportHoverCard() {
  const [open, setOpen] = useState(false);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={100} closeDelay={180}>
      <HoverCardTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-full focus-visible:ring-0 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
          aria-label="Contact support"
          onClick={() => setOpen(true)}
        >
          <MessageCircleQuestionMark />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="end"
        className="w-[min(33.6rem,calc(100vw-2rem))] rounded-xl p-3"
      >
        <div className="px-1 pb-3">
          <p className="font-medium">How can we help?</p>
          <p className="text-xs text-muted-foreground">Choose the fastest way to reach us.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SUPPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <a
                key={option.title}
                href={option.href}
                target={option.target}
                rel={option.rel}
                onClick={() => setOpen(false)}
                className="block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <Card
                  size="sm"
                  className="h-full cursor-pointer gap-3 rounded-xl shadow-none transition-colors hover:bg-muted/50"
                >
                  <CardHeader className="gap-3">
                    <Icon className="size-5" aria-hidden />
                    <div className="flex flex-col gap-1">
                      <CardTitle>{option.title}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {option.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="mt-auto justify-end">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary [&_svg]:size-4">
                      {option.action}
                      <ArrowRight data-icon="inline-end" />
                    </span>
                  </CardFooter>
                </Card>
              </a>
            );
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
```

- [x] **Step 4: Place the component in both authenticated headers**

In `src/layouts/DashboardLayout.tsx`, add:

```tsx
import { SupportHoverCard } from '@/components/SupportHoverCard';
```

Replace the desktop mode-toggle wrapper with:

```tsx
<div className="hidden items-center gap-1 md:flex">
  <SupportHoverCard />
  <ModeToggle />
</div>
```

In `src/pages/WorkspacePage.tsx`, add:

```tsx
import { SupportHoverCard } from '@/components/SupportHoverCard';
```

Replace its desktop mode-toggle wrapper with the same authenticated action group:

```tsx
<div className="hidden items-center gap-1 md:flex">
  <SupportHoverCard />
  <ModeToggle />
</div>
```

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/SupportHoverCard.test.ts
```

Expected: 3 tests pass with no warnings or errors.

- [x] **Step 6: Run targeted quality checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/SupportHoverCard.tsx src/components/SupportHoverCard.test.ts src/layouts/DashboardLayout.tsx src/pages/WorkspacePage.tsx
```

Expected: exit code 0 with no output.

Run:

```bash
git diff --check
```

Expected: exit code 0 with no output.

Run:

```bash
wc -l src/components/SupportHoverCard.tsx src/components/SupportHoverCard.test.ts src/layouts/DashboardLayout.tsx src/pages/WorkspacePage.tsx
```

Expected: every code file is below 300 lines. If either existing header file is already above 300 lines, confirm this change did not push it across the limit and report the pre-existing violation rather than expanding scope.

- [x] **Step 7: Update continuity and commit the implementation**

Record the completed behavior, touched paths, focused test result, ESLint result, diff check, and LOC result in `CONTINUITY.md`, preserving its section caps.

Then run:

```bash
git add src/components/SupportHoverCard.tsx src/components/SupportHoverCard.test.ts src/layouts/DashboardLayout.tsx src/pages/WorkspacePage.tsx CONTINUITY.md docs/superpowers/plans/2026-07-13-dashboard-support-hover-card.md
git commit -m "Add dashboard support hover card"
```

Expected: one commit containing the implementation, focused test, plan, and continuity update without unrelated workspace files.

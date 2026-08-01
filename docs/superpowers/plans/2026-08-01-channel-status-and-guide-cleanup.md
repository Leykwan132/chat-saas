# Channel Status and Guide Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Simplify Channels, Broadcast, and Services while adding a consistent connected-status check to Messenger and Instagram and refining Broadcast's missing-channel action.

**Architecture:** Move the existing ready check into a focused channel-status component and consume it from the legacy Channels page. Remove unreachable book-guide code at its page boundaries, and isolate the Broadcast-specific connection-required view behind an explicit variant on the shared WhatsApp feature gate.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, React Router 7, Vitest 1.6, React DOM server rendering, Lucide React, React Icons.

## Global Constraints

- Run every script and test under Node 22 in the same shell sequence.
- Keep new code files under 300 lines and do not add comments unless a non-obvious workaround cannot be simplified.
- Preserve the unrelated existing edit in `convex/_generated/api.d.ts`.
- Do not write preview data to Convex or leave temporary preview scaffolding in production code.
- Do not add a public changelog entry until production availability is confirmed.

---

### Task 1: Shared connected-channel ready status

**Files:**
- Create: `src/components/channels/ChannelReadyStatus.tsx`
- Create: `src/components/channels/ChannelReadyStatus.test.tsx`
- Modify: `src/pages/ChannelsPage.tsx`

**Interfaces:**
- Produces: `ChannelReadyStatus({ label }: { label: string }): JSX.Element`
- Produces: `SavedConversationStatus({ conversationCount }: { conversationCount: number }): JSX.Element`
- Consumes: the existing emerald check classes and the numeric `conversationCount` already selected by `ConnectedChannelCard`.

- [x] **Step 1: Write the failing rendered-component test**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ChannelReadyStatus, SavedConversationStatus } from './ChannelReadyStatus';

test('renders the shared emerald ready check with its label', () => {
  const markup = renderToStaticMarkup(<ChannelReadyStatus label="Ready" />);

  expect(markup).toContain('bg-emerald-800');
  expect(markup).toContain('text-emerald-100');
  expect(markup).toContain('Ready');
});

test('treats zero saved conversations as a completed connected status', () => {
  const markup = renderToStaticMarkup(<SavedConversationStatus conversationCount={0} />);

  expect(markup).toContain('bg-emerald-800');
  expect(markup).toContain('0 conversations saved');
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/ChannelReadyStatus.test.tsx`

Expected: FAIL because `ChannelReadyStatus.tsx` does not exist.

- [x] **Step 3: Implement the shared status component**

```tsx
import { Check } from 'lucide-react';

export function ChannelReadyStatus({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-800">
        <Check className="size-2.5 text-emerald-100" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="truncate text-[11px] font-medium text-foreground">{label}</span>
    </span>
  );
}

export function SavedConversationStatus({ conversationCount }: { conversationCount: number }) {
  return <ChannelReadyStatus label={`${conversationCount} conversations saved`} />;
}
```

- [x] **Step 4: Replace the private WhatsApp status and plain saved-count text**

Import both exports in `ChannelsPage.tsx`. Render `ChannelReadyStatus` for ready WhatsApp sync labels and `SavedConversationStatus` for connected Messenger and Instagram counts. Remove the private `WhatsAppReadyStatus` function and the now-unused `Check` import.

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/ChannelReadyStatus.test.tsx`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit the ready-status unit**

```bash
git add src/components/channels/ChannelReadyStatus.tsx src/components/channels/ChannelReadyStatus.test.tsx src/pages/ChannelsPage.tsx
git commit -m "Add connected channel ready status"
```

### Task 2: Direct Channels layout without guide books or a section heading

**Files:**
- Create: `src/pages/ChannelsPageLayout.test.ts`
- Modify: `src/pages/ChannelsPage.tsx`

**Interfaces:**
- Consumes: the existing channel-card grid and dialogs unrelated to guides.
- Produces: a Channels page where the grid follows the title header directly.

- [x] **Step 1: Write the failing page-boundary regression**

Read `ChannelsPage.tsx` in the test and assert that the page does not contain the user-visible strings `How channels work`, `Mobile coexistence`, or `Available channels`, and does not reference `ChannelLifecycleGuideDialog` or `WhatsAppCoexistenceGuideDialog`. Assert that `CONNECTABLE_SERVICES.map` remains so the test cannot pass against an accidentally emptied page.

- [x] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ChannelsPageLayout.test.ts`

Expected: FAIL on the current guide and heading strings.

- [x] **Step 3: Remove the complete Channels guide path**

Delete both guide state values, the Guides section, both guide dialog renders, the private `BookCard`, `ChannelLifecycleGuideDialog`, and `WhatsAppCoexistenceGuideDialog` implementations, and every import used only by them. Remove the `Available channels` title and divider, retain the card grid in its existing animated section, and remove only the obsolete top margin that belonged to the heading.

- [x] **Step 4: Run the layout and status tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ChannelsPageLayout.test.ts src/components/channels/ChannelReadyStatus.test.tsx src/pages/PendingWhatsAppConnectionCard.test.tsx`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit the Channels cleanup**

```bash
git add src/pages/ChannelsPage.tsx src/pages/ChannelsPageLayout.test.ts
git commit -m "Simplify channels page layout"
```

### Task 3: Remove book-style guides outside Follow-ups

**Files:**
- Create: `src/pages/PageGuideSections.test.ts`
- Modify: `src/pages/BroadcastPage.tsx`
- Modify: `src/pages/BroadcastPageStructure.test.ts`
- Modify: `src/pages/ServicesPage.tsx`
- Verify unchanged: `src/pages/FollowUpPage.tsx`

**Interfaces:**
- Produces: Broadcast and Services pages with no book-style Guides section or unreachable guide dialogs.
- Preserves: the Follow-ups overview and calculator books.

- [x] **Step 1: Write the failing cross-page regression**

Read the three page sources. Assert Broadcast and Services do not contain a Guides heading or their guide card/dialog symbols, while Follow-ups still contains its Guides heading, overview `BookCard`, and `Cost Calculator` book.

- [x] **Step 2: Run the tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/PageGuideSections.test.ts src/pages/BroadcastPageStructure.test.ts`

Expected: FAIL because Broadcast and Services still render guide books.

- [x] **Step 3: Remove the Broadcast guide row and dead dependencies**

Delete the guide-card section, walkthrough, ban-guide, and calculator state, renders, and imports. Preserve broadcast history, creation, deletion, and confirmation behavior. Update `BroadcastPageStructure.test.ts` to protect the retained history table and the 300-line limit without expecting removed guide symbols.

- [x] **Step 4: Remove the Services guide row and dead dependencies**

Delete the local book-card types/component, Services walkthrough state, Guides section, overview dialog render, and unused imports. Preserve `Your Services`, service cards, appointment sections, and their separators.

- [x] **Step 5: Run the cross-page tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/PageGuideSections.test.ts src/pages/BroadcastPageStructure.test.ts`

Expected: all tests PASS and Follow-ups remains protected.

- [ ] **Step 6: Commit the guide cleanup**

```bash
git add src/pages/BroadcastPage.tsx src/pages/BroadcastPageStructure.test.ts src/pages/ServicesPage.tsx src/pages/PageGuideSections.test.ts
git commit -m "Remove unused page guide books"
```

### Task 4: Broadcast-specific connection-required presentation

**Files:**
- Create: `src/components/WhatsAppFeatureGate.test.tsx`
- Modify: `src/components/WhatsAppFeatureGate.tsx`
- Modify: `src/pages/BroadcastPage.tsx`

**Interfaces:**
- Produces: `connectionRequiredVariant?: 'default' | 'minimal'` on `WhatsAppFeatureGateProps`.
- Produces: exported `WhatsAppConnectionRequiredState` with `agentId`, `feature`, and `variant` props for direct rendered testing.
- Preserves: the default variant used by Follow-ups and Message Templates.

- [x] **Step 1: Write failing rendered tests for both variants**

Render `WhatsAppConnectionRequiredState` inside `MemoryRouter`. For `variant="minimal"`, assert the green WhatsApp icon remains, `Connect Channel` and a Lucide plus render, and `Open Channels`, the bordered icon container, and tinted background do not. For `variant="default"`, assert `Open Channels` and the existing container classes remain.

- [x] **Step 2: Run the test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsAppFeatureGate.test.tsx`

Expected: FAIL because the presentational export and variant do not exist.

- [x] **Step 3: Extract the pure connection-required state**

Move the existing no-WhatsApp markup into `WhatsAppConnectionRequiredState`. Use a direct `SiWhatsapp` for the minimal variant; use the existing wrapped icon for the default. Render `Plus` and `Connect Channel` only for minimal, and preserve `SiWhatsapp` and `Open Channels` for default.

- [x] **Step 4: Opt only Broadcast into the minimal variant**

Pass `connectionRequiredVariant="minimal"` from `BroadcastPage`. Leave the Follow-ups and Message Templates callers unchanged.

- [x] **Step 5: Run feature-gate and page tests and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsAppFeatureGate.test.tsx src/pages/BroadcastPageStructure.test.ts src/pages/PageGuideSections.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the Broadcast empty-state change**

```bash
git add src/components/WhatsAppFeatureGate.tsx src/components/WhatsAppFeatureGate.test.tsx src/pages/BroadcastPage.tsx
git commit -m "Refine broadcast channel connection prompt"
```

### Task 5: Verification, previews, and continuity

**Files:**
- Modify: `CONTINUITY.md`
- Temporary only: local preview assets under `/private/tmp`
- Verify unchanged: `kilobot-docs/docs/releases/changelog.mdx`

**Interfaces:**
- Consumes: all preceding UI changes.
- Produces: test/build receipts and local preview images without production mock data.

- [x] **Step 1: Run focused tests, scoped lint, build, and whitespace checks**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/ChannelReadyStatus.test.tsx src/pages/ChannelsPageLayout.test.ts src/pages/PendingWhatsAppConnectionCard.test.tsx src/pages/PageGuideSections.test.ts src/pages/BroadcastPageStructure.test.ts src/components/WhatsAppFeatureGate.test.tsx
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/channels/ChannelReadyStatus.tsx src/components/channels/ChannelReadyStatus.test.tsx src/components/WhatsAppFeatureGate.tsx src/components/WhatsAppFeatureGate.test.tsx src/pages/ChannelsPage.tsx src/pages/ChannelsPageLayout.test.ts src/pages/BroadcastPage.tsx src/pages/BroadcastPageStructure.test.ts src/pages/ServicesPage.tsx src/pages/PageGuideSections.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
```

Expected: focused tests, lint, build, and whitespace checks PASS. Existing documented build warnings may remain if unchanged.

- [x] **Step 2: Check file lengths and unrelated worktree preservation**

Run: `wc -l` on every created code file and `git status --short`. Confirm each new code file is under 300 lines and `convex/_generated/api.d.ts` remains unmodified by this task.

- [x] **Step 3: Build temporary local previews**

Render a local-only page showing connected Messenger with a positive count, connected Instagram with zero conversations, the simplified Channels layout, and the Broadcast minimal connection prompt. Serve it locally, inspect it in the browser, and capture screenshots. Do not route the preview into the production app and do not persist channel documents.

- [x] **Step 4: Update continuity without publishing a changelog entry**

Add dated `[USER]`, `[CODE]`, and `[TOOL]` facts for the approved scope, implemented state, preview, and verification receipts. Do not edit `kilobot-docs/docs/releases/changelog.mdx` because production availability is unconfirmed.

- [ ] **Step 5: Commit the implementation record if implementation commits are being used**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-01-channel-status-and-guide-cleanup.md
git commit -m "Record channel UI cleanup"
```

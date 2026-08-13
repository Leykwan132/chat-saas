# What’s New Banner Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the approved What’s new reference with the supplied banner, dated Orbit-icon announcement, neutral New badge, and right-to-down disclosure chevron.

**Architecture:** `WhatsNewDialog` owns the decorative modal banner. The structured announcement record owns its ISO date and icon, while `AnnouncementDialogList` formats the date and renders a local `ChevronRight` that rotates only when its Radix Accordion trigger is expanded. The shared Accordion indicator remains unchanged for other product surfaces.

**Tech Stack:** React 19, TypeScript, Vite, shadcn/ui, Radix Accordion/Dialog, Lucide React, Vitest, Node.js 22, Bun.

## Global Constraints

- Use `https://storage.kilobot.app/dashboard/new%20feature%402x.png` as a full-width `object-cover` banner with a 4:1 crop and `21dvh` cap, reducing the earlier banner height by 40%.
- Use Lucide’s `Orbit` icon for the first announcement.
- Store the announcement date as `2026-08-12` and display it as `12 Aug 2026` in a semantic `time` element.
- Render the New badge with a neutral background and border.
- Show `ChevronRight` while closed and rotate it 90 degrees down only while expanded.
- Do not change the shared Accordion indicator behavior.
- Keep code files below 300 lines and do not add code comments.
- Preserve the unrelated untracked `pricing-knowledge-base-updated.md` file.
- Do not update the production changelog while availability remains unconfirmed.

---

### Task 1: Specify the banner and structured announcement metadata

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/WhatsNewDialog.tsx`
- Modify: `src/components/whats-new/announcements.ts`

**Interfaces:**
- Produces: `Announcement.publishedAt: string` containing ISO date `2026-08-12`.
- Produces: a modal-top image whose `src` is the supplied storage URL and whose class includes `aspect-[12/5]`, `w-full`, and `object-cover`.

- [x] **Step 1: Write the failing banner and metadata regression**

Extend `WhatsNewDialog.test.tsx` so the rendered Dialog tree contains an `img` with the literal supplied URL and wide-crop classes. Assert the first announcement has `publishedAt: '2026-08-12'` and `icon: Orbit`.

- [x] **Step 2: Run the focused test and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
```

Expected: FAIL because the banner, date field, and Orbit icon are missing.

- [x] **Step 3: Add the banner and structured metadata**

Add `publishedAt: string` to `Announcement`, change the first icon to `Orbit`, and set `publishedAt: '2026-08-12'`. Render this image before `AnnouncementDialogList`:

```tsx
<img
  src="https://storage.kilobot.app/dashboard/new%20feature%402x.png"
  alt="Kilobot AI conversations and call analytics preview"
  className="aspect-[12/5] w-full object-cover"
/>
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command and expect all `WhatsNewDialog` tests to pass.

### Task 2: Render date, neutral badge, and local chevron states

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/whats-new/AnnouncementDialogList.tsx`

**Interfaces:**
- Consumes: `Announcement.publishedAt` in `YYYY-MM-DD` form.
- Produces: `formatAnnouncementDate(publishedAt: string): string` with the literal display `12 Aug 2026`.
- Produces: an Accordion trigger with `showIndicator={false}` and one local `ChevronRight` using `group-data-[state=open]/accordion-trigger:rotate-90`.

- [x] **Step 1: Write the failing presentation regression**

Update the announcement test fixture with `publishedAt: '2026-08-12'`. Assert rendered text contains `12 Aug 2026`, the tree contains `time` with `dateTime="2026-08-12"`, the New badge includes neutral `bg-muted` styling, the trigger disables its shared indicator, and its `ChevronRight` includes the expanded-state 90-degree rotation class.

- [x] **Step 2: Run the focused test and verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
```

Expected: FAIL because date rendering, the neutral badge, and local chevron are missing.

- [x] **Step 3: Implement the approved presentation**

Format the ISO date in UTC with `Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })`. Render the semantic date beneath the summary, add `bg-muted text-muted-foreground` to the outline Badge, set `showIndicator={false}`, and add:

```tsx
<ChevronRight
  data-slot="announcement-chevron"
  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/accordion-trigger:rotate-90"
/>
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command and expect all announcement tests to pass.

### Task 3: Verify and commit the local refinement

**Files:**
- Modify: `CONTINUITY.md`
- Modify: `docs/superpowers/plans/2026-08-12-whats-new-banner-polish.md`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: a verified local commit on `codex/model-catalog-refresh`.

- [x] **Step 1: Run focused verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx src/components/SupportHoverCard.test.ts
```

- [x] **Step 2: Run scoped lint, build, and whitespace checks**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/WhatsNewDialog.tsx src/components/WhatsNewDialog.test.tsx src/components/whats-new/AnnouncementDialogList.tsx src/components/whats-new/announcements.ts && bun run build && git diff --check
```

- [x] **Step 3: Update continuity and review the diff**

Record the banner/date/icon/tag/chevron result, exact verification receipts, unchanged changelog state, and preservation of `pricing-knowledge-base-updated.md`. Confirm every changed code file remains below 300 lines.

- [x] **Step 4: Commit the verified implementation**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-12-whats-new-banner-polish.md src/components/WhatsNewDialog.tsx src/components/WhatsNewDialog.test.tsx src/components/whats-new/AnnouncementDialogList.tsx src/components/whats-new/announcements.ts
git commit -m "Polish Whats new announcement modal"
```

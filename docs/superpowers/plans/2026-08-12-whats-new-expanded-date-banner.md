# What’s New Expanded Date and Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each announcement date only in expanded accordion content and use the replacement What’s new banner image.

**Architecture:** Keep announcement metadata and formatting unchanged. Move the existing semantic `time` element from `AccordionTrigger` into `AccordionContent`, directly above the detail list, and update the modal banner URL while preserving its crop and viewport constraints.

**Tech Stack:** React, TypeScript, shadcn Accordion/Dialog, Vitest, React server rendering

## Global Constraints

- Use Node.js v22 for every script and test command.
- Preserve the modal’s existing 4:1 crop, `21dvh` cap, accessible image description, and accordion behavior.
- Keep code files below 300 lines and do not add code comments.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Expanded date placement and replacement banner

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/WhatsNewDialog.tsx`
- Modify: `src/components/whats-new/AnnouncementDialogList.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `Announcement.publishedAt: string` and the existing `formatAnnouncementDate(publishedAt: string): string` behavior.
- Produces: `WhatsNewDialog` using `https://storage.kilobot.app/dashboard/new-feature.png`; `AnnouncementDialogList` with a semantic `time` element inside `AccordionContent` only.

- [x] **Step 1: Write the failing regression test**

Update the banner assertion and assert that the trigger omits the date while expanded content contains the semantic date:

```tsx
expect(banner?.props.src).toBe(
  'https://storage.kilobot.app/dashboard/new-feature.png',
);
expect(collectText(accordionTrigger)).not.toContain('12 Aug 2026');
expect(collectText(accordionContent)).toContain('12 Aug 2026');
expect(
  collectElements(accordionContent).find(
    (candidate) => candidate.type === 'time',
  )?.props,
).toMatchObject({ dateTime: '2026-08-12' });
```

- [x] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
```

Expected: FAIL because the banner still uses `new%20feature%402x.png` and the date remains inside `AccordionTrigger`.

- [x] **Step 3: Implement the minimal UI change**

Set the banner source:

```tsx
src="https://storage.kilobot.app/dashboard/new-feature.png"
```

Move the existing `time` element into `AccordionContent`, before the list:

```tsx
<AccordionContent className="px-6 pb-5">
  <time
    dateTime={announcement.publishedAt}
    className="mb-3 block pl-8 text-xs font-normal text-muted-foreground"
  >
    {formatAnnouncementDate(announcement.publishedAt)}
  </time>
  <ul className="flex list-disc flex-col gap-2 pl-8 text-sm text-muted-foreground">
    {announcement.details.map((detail) => (
      <li key={detail}>{detail}</li>
    ))}
  </ul>
</AccordionContent>
```

- [x] **Step 4: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx src/components/SupportHoverCard.test.ts && bunx eslint src/components/WhatsNewDialog.tsx src/components/WhatsNewDialog.test.tsx src/components/whats-new/AnnouncementDialogList.tsx && bun run build && git diff --check
```

Expected: all tests, lint, build, and whitespace checks pass.

- [x] **Step 5: Record and commit the verified change**

Update `CONTINUITY.md` with the user-visible behavior, verification result, and unreleased status, then run:

```bash
git add CONTINUITY.md src/components/WhatsNewDialog.tsx src/components/WhatsNewDialog.test.tsx src/components/whats-new/AnnouncementDialogList.tsx docs/superpowers/plans/2026-08-12-whats-new-expanded-date-banner.md
git commit -m "Refine Whats new announcement details"
```

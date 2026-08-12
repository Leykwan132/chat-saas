# Neutral Announcement Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the expanded model release note one spacious neutral surface without reintroducing nested cards.

**Architecture:** Keep the existing semantic release-note structure and apply the approved surface and spacing only to its root container. Extend the existing announcement regression to protect the single-surface treatment and absence of nested borders/cards.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Run every script under Node v22.
- Keep code files below 300 lines and add no source comments.
- Use one `bg-muted/40` softly rounded release surface with 20px padding and 24px major-section spacing.
- Keep 8px between section headings and content.
- Do not add borders, separate section cards, nested neutral backgrounds, pills, or extra indentation.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Release-note surface and spacing

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/whats-new/AnnouncementReleaseDetails.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the existing `data-slot="announcement-release"` root and semantic release sections.
- Produces: one root surface with `rounded-xl bg-muted/40 p-5 gap-6`, while section content retains `gap-2` and descendants remain free of border or background-card treatments.

- [ ] **Step 1: Write the failing surface test**

  Assert the release root includes `rounded-xl`, `bg-muted/40`, `p-5`, and `gap-6`. Assert its descendants contain no other `bg-muted/40`, `rounded-xl`, or `border` classes except the existing date divider’s `border-t`.

- [ ] **Step 2: Run the focused test to verify RED**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
  ```

  Expected: FAIL because the release root currently has only `flex flex-col gap-5`.

- [ ] **Step 3: Apply the approved root treatment**

  Change the release root class to:

  ```tsx
  className="flex flex-col gap-6 rounded-xl bg-muted/40 p-5"
  ```

  Leave the existing section `gap-2` classes and date divider unchanged.

- [ ] **Step 4: Run focused verification to verify GREEN**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
  ```

  Expected: all tests pass.

- [ ] **Step 5: Run the scoped quality gate**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/WhatsNewDialog.test.tsx src/components/whats-new/AnnouncementReleaseDetails.tsx
  source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
  source ~/.nvm/nvm.sh && nvm use 22 && bun run build
  git diff --check
  ```

  Expected: all commands pass; the build may retain only established bundle-size warnings.

- [ ] **Step 6: Record continuity and commit**

  Record the verified unreleased visual improvement in `CONTINUITY.md`, leave the changelog unchanged, stage only task-owned files, and commit with:

  ```bash
  git commit -m "Style neutral announcement surface"
  ```

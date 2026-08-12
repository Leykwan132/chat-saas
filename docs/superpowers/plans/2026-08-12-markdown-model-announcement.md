# Markdown Model Announcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the card-heavy model announcement details with a flat, left-aligned release note that clearly names new models, retired models, model costs, and the release date.

**Architecture:** Keep announcement content in the existing local structured data module, but replace presentation-specific spotlight/card fields with release-note fields. Let `AnnouncementReleaseDetails` own all expanded content, including the final formatted date row, while `AnnouncementDialogList` remains responsible only for the modal list and accordion interaction.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Radix Accordion through shadcn, Lucide React, Vitest.

## Global Constraints

- Run every script under Node v22.
- Keep code files below 300 lines and add no source comments.
- Use the exact release heading `New Credit system for Models.`.
- Use the section order `New Models`, `Retired Models`, `Cost of Models`, then the calendar-backed release date.
- Render one left-aligned content column without cards, tinted panels, decorative circles, pills, or nested `pl-8` indentation.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Flat model release note

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/whats-new/announcements.ts`
- Modify: `src/components/whats-new/AnnouncementReleaseDetails.tsx`
- Modify: `src/components/whats-new/AnnouncementDialogList.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: `Announcement` identity, summary, icon, `publishedAt`, and `isNew` fields used by `AnnouncementDialogList`.
- Produces: `Announcement.newModels: Array<{ name: string; description: string }>`, `Announcement.retiredModels: string[]`, `Announcement.modelCosts: Array<{ cost: string; models: string[] }>`, `Announcement.releaseTitle: string`, and `Announcement.releaseSummary: string` for `AnnouncementReleaseDetails`.

- [x] **Step 1: Write the failing data and rendering tests**

  Replace the legacy spotlight/card assertions with literal expected structured release data. Assert the rendered detail order, every model and cost group, flat layout classes, and that the calendar-backed `Released on 12 Aug 2026` row is the final child.

- [x] **Step 2: Run the focused test to verify RED**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
  ```

  Expected: FAIL because the production announcement still exposes spotlight/card fields, places the date before the details, and renders nested containers.

- [x] **Step 3: Replace presentation fields with structured release-note data**

  Define and populate:

  ```ts
  releaseTitle: 'New Credit system for Models.'
  releaseSummary: 'Model pricing now uses clear credit tiers for every message.'
  newModels: [
    { name: 'OpenAI GPT-OSS 120B', description: 'Budget-friendly reasoning' },
    { name: 'Qwen3.7 Flash', description: 'Fast Chinese conversations' },
    { name: 'NVIDIA Nemotron 3.5 Lightning', description: 'Fast English responses' },
    { name: 'GPT-5.6 Luna', description: 'Higher overall performance' },
  ]
  retiredModels: ['Amazon Nova Micro', 'Google Gemini 3.1 Flash Lite']
  modelCosts: [
    { cost: '0.5 credits/message', models: ['OpenAI GPT-OSS 120B', 'Qwen3.7 Flash'] },
    { cost: '1 credit/message', models: ['DeepSeek V4 Flash', 'NVIDIA Nemotron 3.5 Lightning'] },
    { cost: '2 credits/message', models: ['GPT-5.6 Luna'] },
  ]
  ```

- [x] **Step 4: Render the flat markdown-style hierarchy**

  Render the title and summary, three semantic sections with simple lists/description rows, and the date as the last bordered row. Remove legacy `Badge`, `Archive`, and `Sparkles` presentation plus the date block from `AnnouncementDialogList`.

- [x] **Step 5: Run focused verification to verify GREEN**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
  ```

  Expected: all tests pass.

- [x] **Step 6: Run the scoped quality gate**

  Run:

  ```bash
  source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/WhatsNewDialog.test.tsx src/components/whats-new/announcements.ts src/components/whats-new/AnnouncementReleaseDetails.tsx src/components/whats-new/AnnouncementDialogList.tsx
  source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc --noEmit
  source ~/.nvm/nvm.sh && nvm use 22 && bun run build
  git diff --check
  ```

  Expected: all commands pass; the build may retain only its established environment and bundle-size warnings.

- [x] **Step 7: Record continuity and commit**

  Record the verified unreleased change in `CONTINUITY.md`, leave the public changelog unchanged, stage only task-owned files, and commit with:

  ```bash
  git commit -m "Simplify model release announcement"
  ```

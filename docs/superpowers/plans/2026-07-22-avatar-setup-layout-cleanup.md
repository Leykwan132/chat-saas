# Avatar Setup Layout Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Avatar setup flow minimal while confirming the selected avatar on the voice step and grouping voice preview with the final embed action.

**Architecture:** Keep the existing `AvatarCreatePage` state and provider actions. Change only its presentation and local step transition, extracting no new backend behavior and reusing the installed shadcn `Skeleton` and `Empty` components.

**Tech Stack:** React 19, React Router, Convex React, shadcn/ui, Tailwind CSS, Vitest, Node.js 22.

## Global Constraints

- Keep every code file at or below 300 lines.
- Do not change Convex functions, LiveAvatar calls, permissions, routes, or stored configuration.
- Do not display provider avatar or voice identifiers.
- Do not commit implementation files because the Avatar feature files are currently untracked shared-worktree changes.

---

### Task 1: Lock the minimal setup contract

**Files:**
- Modify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Consumes: the source text of `src/pages/AvatarCreatePage.tsx`.
- Produces: a focused regression contract for layout, loading, and local navigation.

- [ ] **Step 1: Write the failing source contract**

Add assertions requiring `Choose your avatar`, the concise description, `Skeleton`, `AvatarGridSkeleton`, `VoiceFormSkeleton`, direct `setStep(2)` from avatar selection, and `setStep(1)` from voice Back. Require `Back to Avatar`, a selected-avatar summary before `Choose your voice`, and the preview action before the embed action. Assert the source omits `StepMarker`, Card composition, the `Check` icon, and the avatar-step `Continue` button.

- [ ] **Step 2: Run the contract and confirm RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because the selected-avatar summary and final preview action placement are missing and the Back label is outdated.

### Task 2: Implement the borderless two-view flow

**Files:**
- Modify: `src/pages/AvatarCreatePage.tsx`

**Interfaces:**
- Consumes: existing `avatars`, `voices`, `step`, selection state, preview actions, and embed action.
- Produces: `AvatarGridSkeleton`, `VoiceFormSkeleton`, and direct avatar-to-voice navigation.

- [ ] **Step 1: Replace page and catalog loading with Skeleton composition**

Import `Skeleton`, render a compact page header skeleton before configuration resolves, render eight tile skeletons in the responsive avatar grid, and render label/control/button skeletons for the voice form.

- [ ] **Step 2: Keep navigation and voice context explicit**

Keep Card imports and wrappers absent, keep `StepMarker` removed, use `Back to Avatar` for both views, and render a compact selected-avatar thumbnail and name above the voice heading.

- [ ] **Step 3: Advance directly from avatar selection**

Replace the avatar choice callback with:

```tsx
onSelect={() => {
  setSelectedAvatarId(avatar.id);
  setStep(2);
}}
```

Remove the selected check icon and Continue action. Preserve the voice-step Back action as `onClick={() => setStep(1)}` so the prior selection remains in state.

- [ ] **Step 4: Group the voice actions**

Move voice preview out of the voice field and into the bottom-right action row immediately before the save or embed action. Keep its loading, stop, and disabled behavior unchanged.

- [ ] **Step 5: Run focused GREEN verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AvatarEmbedPage.test.ts
```

Expected: 5 tests pass.

### Task 3: Verify integration quality

**Files:**
- Verify: `src/pages/AvatarCreatePage.tsx`
- Verify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Consumes: the completed UI implementation.
- Produces: build and lint evidence without backend deployment.

- [ ] **Step 1: Run scoped lint and build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.test.ts && bun run build
```

Expected: ESLint exits 0 and the TypeScript/Vite production build succeeds.

- [ ] **Step 2: Check file limits and whitespace**

```bash
wc -l src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.test.ts
git diff --check
```

Expected: both code files are at or below 300 lines and `git diff --check` is clean.

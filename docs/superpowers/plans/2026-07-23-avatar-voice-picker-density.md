# Avatar Voice Picker Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present Avatar voices in a responsive two-column picker, make preview controls visually discoverable, and enlarge the selected-avatar preview by approximately 30%.

**Architecture:** Refine only the existing `AvatarVoicePickerDialog` presentation and `SelectedAvatarSummary` sizing. Preserve all current provider filtering, selection, preview loading, caching, playback coordination, and error behavior while enforcing the approved layout through focused source contracts.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui, Radix Dialog, Vitest 1.6.0, Node.js 22.

## Global Constraints

- Use Node.js 22 for every script and test command.
- Keep every code file at or below 300 lines.
- Voice choices use one column below 480px and two columns at 480px and wider.
- The preview control always has a semantic background and uses a stronger semantic treatment while playing.
- The selected-avatar 16:9 preview grows from 208px to approximately 270px without overflowing narrow layouts.
- Voice filtering, selection, preview requests, audio caching, playback coordination, error handling, and backend behavior remain unchanged.
- Do not commit implementation files because they belong to the existing shared untracked Avatar feature; commit only this plan document.

---

### Task 1: Refine voice picker density and selected-avatar sizing

**Files:**
- Modify: `src/pages/AvatarEmbedPage.test.ts`
- Modify: `src/components/avatar/AvatarVoicePickerDialog.tsx`
- Modify: `src/pages/AvatarCreatePage.tsx`

**Interfaces:**
- Consumes: existing `VoiceOption[]`, `VoicePreviewController`, `AvatarPreviewMedia`, and shadcn `Button`/`Dialog` components.
- Produces: a responsive voice grid and semantic preview-button states without changing component props or backend calls.

- [ ] **Step 1: Write the failing presentation contract**

Extend the existing `aligns both setup fields and enlarges the selected avatar` setup contract in `src/pages/AvatarEmbedPage.test.ts`:

```ts
expect(voiceDialogSource).toContain('min-[480px]:max-w-2xl');
expect(voiceDialogSource).toContain('min-[480px]:grid-cols-2');
expect(voiceDialogSource).toContain("variant={isPlaying ? 'default' : 'secondary'}");
expect(createSource).toContain('className="w-[270px] max-w-full shrink rounded-lg"');
expect(createSource).not.toContain('className="w-52 shrink-0 rounded-lg"');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because the dialog is still single-column, the preview button is still ghost-styled, and the selected avatar is still 208px wide.

- [ ] **Step 3: Implement the minimal dialog refinement**

In `src/components/avatar/AvatarVoicePickerDialog.tsx`, widen the dialog from 480px upward:

```tsx
<DialogContent className="min-[480px]:max-w-2xl">
```

Replace the voice-list container with the responsive grid:

```tsx
<div className="grid max-h-[60vh] grid-cols-1 gap-1 overflow-y-auto min-[480px]:grid-cols-2">
```

Keep each voice row borderless and allow it to shrink within its grid cell:

```tsx
<div key={voice.id} className="group flex min-w-0 items-center rounded-lg hover:bg-muted/50">
```

Use built-in semantic Button variants for the persistent and playing backgrounds:

```tsx
<Button
  type="button"
  variant={isPlaying ? 'default' : 'secondary'}
  size="icon"
  className="mr-2 shrink-0 rounded-full"
  aria-label={isPlaying ? `Pause ${voice.name}` : `Preview ${voice.name}`}
  onClick={(event) => {
    event.stopPropagation();
    void controller.toggle(voice.id, () => loadPreview(voice.id)).catch((error: unknown) => {
      controller.stop();
      toast.error(error instanceof Error ? error.message : 'Could not play voice preview');
    });
  }}
>
  {isLoading ? <LoaderCircle className="animate-spin" /> : isPlaying ? <Pause /> : <Play />}
</Button>
```

- [ ] **Step 4: Enlarge the selected-avatar preview responsively**

In `src/pages/AvatarCreatePage.tsx`, update `SelectedAvatarSummary`:

```tsx
function SelectedAvatarSummary({ avatar }: { avatar: AvatarOption }) {
  return <div className="flex items-center gap-3"><AvatarPreviewMedia previewUrl={avatar.previewUrl} className="w-[270px] max-w-full shrink rounded-lg" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Selected avatar</p><p className="truncate text-sm font-medium">{avatar.name}</p></div></div>;
}
```

- [ ] **Step 5: Run focused GREEN verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarVoicePickerDialog.test.ts
```

Expected: 2 files and 10 tests pass.

---

### Task 2: Verify the presentation refinement

**Files:**
- Verify: `src/components/avatar/AvatarVoicePickerDialog.tsx`
- Verify: `src/pages/AvatarCreatePage.tsx`
- Verify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Produces: focused test, lint, build, whitespace, and module-boundary evidence.

- [ ] **Step 1: Run scoped ESLint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/AvatarVoicePickerDialog.tsx src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.test.ts
```

Expected: exit code 0.

- [ ] **Step 2: Run the production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected for this refinement: no new TypeScript or Vite error. If the current baseline voice-preview errors at `AvatarVoicePickerDialog.tsx:41` and `voicePreviewController.ts:21-22` remain, record the build as blocked by those unchanged errors rather than expanding this presentation task.

- [ ] **Step 3: Check file boundaries and whitespace**

```bash
wc -l src/components/avatar/AvatarVoicePickerDialog.tsx src/pages/AvatarCreatePage.tsx
git diff --check
```

Expected: both production files remain at or below 300 lines and the workspace diff has no whitespace errors.

# Avatar Setup Field Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Language and Voice setup fields, rename the first-time action to `Create avatar`, and enlarge the selected-avatar preview to 208px.

**Architecture:** Define one shared Avatar setup field class string and consume it from both the Radix Select trigger and voice-dialog Button trigger. Keep the existing data and action flow unchanged while adjusting the CTA copy and selected-avatar presentation in `AvatarCreatePage`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui, Radix Select/Dialog, Vitest 1.6.0, Node.js 22.

## Global Constraints

- Use Node.js 22 for every script and test command.
- Keep every code file at or below 300 lines.
- First-time setup says `Create avatar`; edit mode stays `Save changes`.
- The selected-avatar preview is 208px wide and remains 16:9.
- Provider catalogs, validation, Embed V2, sandbox behavior, and Convex Agent flow remain unchanged.
- Do not commit implementation files because they are part of the existing shared untracked Avatar work.

---

### Task 1: Align Avatar setup presentation

**Files:**
- Create: `src/components/avatar/avatarSetupStyles.ts`
- Modify: `src/pages/AvatarEmbedPage.test.ts`
- Modify: `src/pages/AvatarCreatePage.tsx`
- Modify: `src/components/avatar/AvatarVoicePickerDialog.tsx`

**Interfaces:**
- Produces: `avatarSetupFieldClassName: string` used by both field triggers.
- Preserves: existing selection, preview, create, and edit behavior.

- [ ] **Step 1: Write the failing setup contract**

Add the style source and assertions to `AvatarEmbedPage.test.ts`:

```ts
const setupStylesSource = readFileSync(new URL('../components/avatar/avatarSetupStyles.ts', import.meta.url), 'utf8');

expect(setupStylesSource).toContain("h-10 w-full rounded-md border-border bg-background px-3 text-sm font-normal");
expect(createSource).toContain('avatarSetupFieldClassName');
expect(voiceDialogSource).toContain('avatarSetupFieldClassName');
expect(createSource).toContain("className=\"w-52 shrink-0 rounded-lg\"");
expect(createSource).toContain("configuration?.embedUrl ? 'Save changes' : 'Create avatar'");
expect(createSource).not.toContain('Create embed link');
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because the shared style module is absent, the preview is still `w-36`, and the CTA still says `Create embed link`.

- [ ] **Step 3: Add the shared field style**

Create `avatarSetupStyles.ts`:

```ts
export const avatarSetupFieldClassName = 'h-10 w-full rounded-md border-border bg-background px-3 text-sm font-normal';
```

- [ ] **Step 4: Apply the shared style and approved copy**

Import `avatarSetupFieldClassName` into both components and import `cn` from `@/lib/utils` into the dialog. Use the shared class directly on `SelectTrigger`:

```tsx
<SelectTrigger id="avatar-language" className={avatarSetupFieldClassName}>
```

Use it with alignment on the voice trigger:

```tsx
<Button
  type="button"
  variant="outline"
  className={cn(avatarSetupFieldClassName, 'justify-start')}
  disabled={!languageCode}
>
```

Change the selected preview and first-time CTA in `AvatarCreatePage.tsx`:

```tsx
<AvatarPreviewMedia previewUrl={avatar.previewUrl} className="w-52 shrink-0 rounded-lg" />
```

```tsx
{creating ? 'Saving…' : configuration?.embedUrl ? 'Save changes' : 'Create avatar'}
```

- [ ] **Step 5: Run focused GREEN verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarVoicePickerDialog.test.ts
```

Expected: both test files pass.

---

### Task 2: Verify the refinement

**Files:**
- Verify: `src/components/avatar/avatarSetupStyles.ts`
- Verify: `src/pages/AvatarCreatePage.tsx`
- Verify: `src/components/avatar/AvatarVoicePickerDialog.tsx`
- Verify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Produces: test, lint, build, whitespace, and file-boundary evidence.

- [ ] **Step 1: Run scoped ESLint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/avatarSetupStyles.ts src/components/avatar/AvatarVoicePickerDialog.tsx src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.test.ts
```

Expected: exit code 0.

- [ ] **Step 2: Run the production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite exit successfully.

- [ ] **Step 3: Check boundaries**

```bash
wc -l src/components/avatar/avatarSetupStyles.ts src/components/avatar/AvatarVoicePickerDialog.tsx src/pages/AvatarCreatePage.tsx
git diff --check
```

Expected: every code file is at or below 300 lines and the diff is clean.

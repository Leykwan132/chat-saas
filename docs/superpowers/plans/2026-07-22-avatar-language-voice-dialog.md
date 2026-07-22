# Avatar Language and Voice Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text Avatar language entry and the native voice selector with LiveAvatar-supported languages, compatible voice filtering, inline dialog previews, flag presentation, and portrait-safe avatar media.

**Architecture:** Extend the protected provider catalog with languages and enforce language/voice compatibility at embed creation. Keep selection state in `AvatarCreatePage`, isolate flag and media presentation, and give the voice dialog a testable controller that owns one audio instance at a time.

**Tech Stack:** React 19, Convex actions, shadcn/ui, Radix Dialog/Select, Tailwind CSS, `flag-icons` 7.5.0, Vitest 1.6.0, Node.js 22.

## Global Constraints

- Use Node.js 22 for every script and test command.
- Keep every code file at or below 300 lines.
- Keep `LIVEAVATAR_API_KEY` server-only.
- Keep Full Mode, sandbox forcing, and the unchanged Convex Agent call intact.
- Keep Embed V2 orientation fixed to `horizontal`.
- Keep Avatar billing and custom/photo-generated avatars out of scope.
- Do not expose avatar IDs or voice IDs as user-editable values.
- Do not commit implementation files because Avatar is an existing untracked shared-worktree change; commit only this plan document.

---

### Task 1: Add supported languages and compatibility validation

**Files:**
- Modify: `convex/avatarProvider.ts`
- Modify: `convex/avatarEmbed.ts`
- Modify: `convex/avatarProvider.test.ts`
- Modify: `src/components/avatar/avatarTypes.ts`

**Interfaces:**
- Consumes: `/v1/languages` records shaped as `{ language: string; code: string }`.
- Produces: `LanguageOption`, `mapSupportedLanguages`, and `validateLanguageVoiceSelection`.

- [ ] **Step 1: Write failing provider tests**

Add to `convex/avatarProvider.test.ts`:

```ts
it('maps supported languages to friendly options', () => {
  expect(avatarProvider.mapSupportedLanguages([
    { language: 'English', code: 'en' },
    { language: 'Malay', code: 'ms' },
  ])).toEqual([
    { name: 'English', code: 'en' },
    { name: 'Malay', code: 'ms' },
  ]);
});

it('requires a catalog language and a matching voice', () => {
  const catalog = {
    languages: [{ name: 'English', code: 'en' }],
    voices: [{ id: 'voice-en', name: 'Hope', language: 'en', gender: 'female' }],
  };
  expect(avatarProvider.validateLanguageVoiceSelection(catalog, {
    language: 'en', voiceId: 'voice-en',
  }).id).toBe('voice-en');
  expect(() => avatarProvider.validateLanguageVoiceSelection(catalog, {
    language: 'ms', voiceId: 'voice-en',
  })).toThrow('Choose an available language');
  expect(() => avatarProvider.validateLanguageVoiceSelection(catalog, {
    language: 'en', voiceId: 'voice-ms',
  })).toThrow('Choose a voice for the selected language');
});

it('loads languages through the protected catalog', () => {
  const source = readFileSync(new URL('./avatarEmbed.ts', import.meta.url), 'utf8');
  expect(source).toContain("providerRequest<ProviderLanguage[]>(apiKey, '/v1/languages')");
  expect(source).toContain('languages: mapSupportedLanguages(languageRecords)');
});
```

- [ ] **Step 2: Run the test and confirm RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run convex/avatarProvider.test.ts
```

Expected: FAIL because the mapper, validator, and endpoint request are absent.

- [ ] **Step 3: Add shared types and helpers**

Add to `avatarTypes.ts`:

```ts
export type LanguageOption = { code: string; name: string };
```

Add to `avatarProvider.ts`:

```ts
type SupportedLanguageRecord = { language: string; code: string };
type CompatibleVoice = {
  id: string;
  name: string;
  language: string;
  gender: string;
  description?: string;
};

export function mapSupportedLanguages(records: SupportedLanguageRecord[]) {
  return records.map((record) => ({ code: record.code, name: record.language }));
}

export function validateLanguageVoiceSelection(
  catalog: {
    languages: Array<{ code: string; name: string }>;
    voices: CompatibleVoice[];
  },
  selection: { language: string; voiceId: string },
) {
  if (!catalog.languages.some((item) => item.code === selection.language)) {
    throw new Error('Choose an available language');
  }
  const voice = catalog.voices.find((item) => item.id === selection.voiceId);
  if (!voice || voice.language !== selection.language) {
    throw new Error('Choose a voice for the selected language');
  }
  return voice;
}
```

- [ ] **Step 4: Extend `loadCatalog` and embed validation**

Add `type ProviderLanguage = { language: string; code: string }` to `avatarEmbed.ts`, request the three catalogs concurrently, and return mapped languages:

```ts
const [avatarPage, voices, languageRecords] = await Promise.all([
  providerRequest<Paginated<ProviderAvatar>>(apiKey, '/v1/avatars/public?page=1&page_size=100'),
  loadVoices(apiKey),
  providerRequest<ProviderLanguage[]>(apiKey, '/v1/languages'),
]);
return {
  avatars: mapPublicAvatars(avatarPage.results),
  voices,
  languages: mapSupportedLanguages(languageRecords),
};
```

In `create`, load the catalog before provider writes and use:

```ts
const avatar = catalog.avatars.find((item) => item.id === args.avatarId);
if (!avatar) throw new Error('Choose an available avatar');
const voice = validateLanguageVoiceSelection(catalog, {
  language: args.language.trim(),
  voiceId: args.voiceId,
});
```

- [ ] **Step 5: Run provider GREEN verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run convex/avatarProvider.test.ts convex/avatar.test.ts
```

Expected: both files pass without live provider calls.

---

### Task 2: Add flag and portrait-safe media primitives

**Files:**
- Create: `src/components/avatar/AvatarLanguageFlag.tsx`
- Create: `src/components/avatar/AvatarLanguageFlag.test.ts`
- Create: `src/components/avatar/AvatarPreviewMedia.tsx`
- Modify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Produces: `getLanguageFlagRegion`, `AvatarLanguageFlag`, and `AvatarPreviewMedia`.

- [ ] **Step 1: Write failing primitive tests**

Create `AvatarLanguageFlag.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getLanguageFlagRegion } from './AvatarLanguageFlag';

describe('Avatar language flags', () => {
  it('derives countries and omits non-country languages', () => {
    expect(getLanguageFlagRegion('ms')).toBe('my');
    expect(getLanguageFlagRegion('ja')).toBe('jp');
    expect(getLanguageFlagRegion('multi')).toBeUndefined();
    expect(getLanguageFlagRegion('%%%')).toBeUndefined();
  });
});
```

Add a source contract in `AvatarEmbedPage.test.ts` requiring `AvatarPreviewMedia.tsx` to contain `aspect-video` and `object-contain`.

- [ ] **Step 2: Run the tests and confirm RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/components/avatar/AvatarLanguageFlag.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Implement `AvatarLanguageFlag`**

```tsx
import 'flag-icons/css/flag-icons.min.css';
import { Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getLanguageFlagRegion(languageCode: string) {
  if (languageCode === 'multi') return undefined;
  try {
    return new Intl.Locale(languageCode).maximize().region?.toLowerCase();
  } catch {
    return undefined;
  }
}

export function AvatarLanguageFlag({ languageCode, className }: {
  languageCode: string;
  className?: string;
}) {
  const region = getLanguageFlagRegion(languageCode);
  if (!region) return <Globe2 aria-hidden className={cn('size-4 text-muted-foreground', className)} />;
  return <span aria-hidden className={cn('fi rounded-sm', `fi-${region}`, className)} />;
}
```

The catch has an explicit globe fallback and is not empty.

- [ ] **Step 4: Implement `AvatarPreviewMedia`**

```tsx
import { ScanFace } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AvatarPreviewMedia({ previewUrl, className }: {
  previewUrl?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex aspect-video items-center justify-center overflow-hidden bg-zinc-900', className)}>
      {previewUrl
        ? <img src={previewUrl} alt="" className="size-full object-contain" />
        : <ScanFace className="size-8 text-zinc-400" />}
    </div>
  );
}
```

- [ ] **Step 5: Run primitive GREEN verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/components/avatar/AvatarLanguageFlag.test.ts src/pages/AvatarEmbedPage.test.ts
```

Expected: both test files pass.

---

### Task 3: Build a one-audio preview controller

**Files:**
- Create: `src/components/avatar/voicePreviewController.ts`
- Create: `src/components/avatar/voicePreviewController.test.ts`

**Interfaces:**
- Produces: `VoicePreviewController.toggle(voiceId, load)` and `stop()`.

- [ ] **Step 1: Write failing controller tests**

Create typed fake audio and deferred-promise helpers, then cover:

```ts
it('plays, pauses, and resumes the same voice', async () => {
  const audio = createFakeAudio();
  const snapshots: VoicePreviewSnapshot[] = [];
  const controller = new VoicePreviewController(() => audio, (state) => snapshots.push(state));
  await controller.toggle('voice-1', async () => 'audio-one');
  await controller.toggle('voice-1', async () => 'audio-one');
  await controller.toggle('voice-1', async () => 'audio-one');
  expect(audio.play).toHaveBeenCalledTimes(2);
  expect(audio.pause).toHaveBeenCalledTimes(1);
  expect(snapshots.at(-1)).toEqual({ voiceId: 'voice-1', status: 'playing' });
});
```

Add separate cases asserting that switching voices pauses the old audio, cached base64 avoids a second load, `stop()` resets `currentTime`, and a load resolving after `stop()` is ignored.

- [ ] **Step 2: Run the controller test and confirm RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/components/avatar/voicePreviewController.test.ts
```

Expected: FAIL because the controller is absent.

- [ ] **Step 3: Implement the controller API**

Define:

```ts
export type VoicePreviewSnapshot = {
  voiceId?: string;
  status: 'idle' | 'loading' | 'playing' | 'paused';
};

export type VoicePreviewAudio = {
  currentTime: number;
  onended: (() => void) | null;
  play: () => Promise<void>;
  pause: () => void;
};
```

Implement one cached `Map<string, string>`, one current audio/voice pair, and a monotonically increasing request version. `toggle` pauses/resumes the same audio, calls `stop()` before switching voices, emits loading before fetching, rejects stale completions, assigns `onended = () => stop()`, and emits playing after `play()`. `stop()` increments the request version, pauses, resets `currentTime`, clears the current pair, and emits `{ status: 'idle' }`.

- [ ] **Step 4: Run controller GREEN verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/components/avatar/voicePreviewController.test.ts
```

Expected: play/pause/resume, switching, caching, stale-load, and cleanup cases pass.

---

### Task 4: Build the dialog-based voice picker

**Files:**
- Create: `src/components/avatar/AvatarVoicePickerDialog.tsx`
- Create: `src/components/avatar/AvatarVoicePickerDialog.test.ts`

**Interfaces:**
- Consumes: `agentId: Id<'agents'>`, `languageCode`, `voices`, `selectedVoiceId`, and `onSelect`.
- Produces: a field-like dialog trigger with compatible voice rows and inline previews.

- [ ] **Step 1: Read installed shadcn contracts**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp BUN_INSTALL_CACHE_DIR=/private/tmp/bun-cache bunx --bun shadcn@latest docs dialog button empty
```

Expected: official docs and example URLs for all three installed components. Fetch those official URLs before composing the dialog.

- [ ] **Step 2: Write the failing dialog contract**

Create `AvatarVoicePickerDialog.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarVoicePickerDialog.tsx', import.meta.url), 'utf8');

describe('Avatar voice picker dialog', () => {
  it('selects rows separately from one-at-a-time previews', () => {
    expect(source).toContain('<Dialog');
    expect(source).toContain('Choose a voice');
    expect(source).toContain('voice.language === languageCode');
    expect(source).toContain('api.avatarEmbed.previewVoice');
    expect(source).toContain('controller.toggle(voice.id');
    expect(source).toContain('controller.stop()');
    expect(source).toContain('<Pause');
    expect(source).toContain('<Play');
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('No voices available');
  });
});
```

- [ ] **Step 3: Run the dialog test and confirm RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/components/avatar/AvatarVoicePickerDialog.test.ts
```

Expected: FAIL because the module is absent.

- [ ] **Step 4: Implement the dialog shell and filtering**

Create `AvatarVoicePickerDialog.tsx` using installed Dialog, Button, and Empty primitives. Start with:

```tsx
const compatibleVoices = voices.filter((voice) => voice.language === languageCode);
const selectedVoice = voices.find((voice) => voice.id === selectedVoiceId);
```

The trigger is a full-width outline field showing `selectedVoice?.name ?? 'Select a voice'` and is disabled when `languageCode` is empty. The dialog title is `Choose a voice`.

- [ ] **Step 5: Connect the preview controller**

Create one controller for the component lifetime:

```tsx
const controllerRef = useRef<VoicePreviewController>();
if (!controllerRef.current) {
  controllerRef.current = new VoicePreviewController(
    (audioBase64) => new Audio(`data:audio/mpeg;base64,${audioBase64}`),
    setPreview,
  );
}
const controller = controllerRef.current;
useEffect(() => () => controller.stop(), [controller]);
```

Load base64 only through the protected action:

```tsx
const loadPreview = async (voiceId: string) => {
  const result = await previewVoice({ agentId, voiceId });
  return result.audioBase64;
};
```

Catch toggle errors, call `controller.stop()`, and show `toast.error` using the existing provider-error pattern.

- [ ] **Step 6: Render valid row and preview interactions**

Each row is a `group` container with two sibling buttons, never a button nested inside a button. The main button selects, stops preview, calls `onSelect(voice.id)`, and closes. The trailing icon button calls `event.stopPropagation()` and `controller.toggle(voice.id, loadPreview)`.

Use `LoaderCircle` while that voice is loading, `Pause` while it is playing, and `Play` otherwise. Keep the icon visible; apply circular muted background on `group-hover` and `focus-visible` without changing layout.

On dialog close, call `controller.stop()`. Render:

```tsx
<Empty className="min-h-48">
  <EmptyHeader>
    <EmptyTitle>No voices available</EmptyTitle>
    <EmptyDescription>There are no public voices for this language yet.</EmptyDescription>
  </EmptyHeader>
</Empty>
```

when `compatibleVoices` is empty.

- [ ] **Step 7: Run dialog GREEN verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/components/avatar/AvatarVoicePickerDialog.test.ts src/components/avatar/voicePreviewController.test.ts
```

Expected: both test files pass.

---

### Task 5: Compose language and voice selection into setup

**Files:**
- Modify: `src/pages/AvatarCreatePage.tsx`
- Modify: `src/pages/AvatarEmbedPage.test.ts`

**Interfaces:**
- Consumes: provider `languages`, `AvatarLanguageFlag`, `AvatarVoicePickerDialog`, and `AvatarPreviewMedia`.
- Produces: Language-first selection, compatible voice clearing, dialog previews, and portrait-safe tiles.

- [ ] **Step 1: Extend the failing setup contract**

Add:

```ts
expect(createSource).toContain('result.languages');
expect(createSource.indexOf('avatar-language')).toBeLessThan(createSource.indexOf('<AvatarVoicePickerDialog'));
expect(createSource).toContain('<AvatarLanguageFlag');
expect(createSource).toContain('<AvatarVoicePickerDialog');
expect(createSource).toContain('selectedVoice?.language !== value');
expect(createSource).toContain('<AvatarPreviewMedia');
expect(createSource).not.toContain('<Input id="avatar-language"');
expect(createSource).not.toContain('<select id="avatar-voice"');
expect(createSource).not.toContain("'Preview voice'");
```

- [ ] **Step 2: Run the setup contract and confirm RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/pages/AvatarEmbedPage.test.ts
```

Expected: FAIL because the page still owns free-text language, native voice selection, preview audio, and cropping images.

- [ ] **Step 3: Load and preserve supported choices**

Add `LanguageOption[]` state. When `listOptions` resolves:

```tsx
setLanguages(result.languages);
const configuredLanguage = result.languages.find(
  (option) => option.code === configuration.language,
)?.code ?? '';
setLanguage(configuredLanguage);
setSelectedVoiceId((current) => {
  const candidate = result.voices.find((voice) =>
    voice.id === current || voice.name === configuration.voiceName,
  );
  return candidate?.language === configuredLanguage ? candidate.id : '';
});
```

Do not silently choose the first provider language or voice.

- [ ] **Step 4: Render Language before Voice**

Use installed shadcn Select primitives. Each item and the closed selected presentation contains:

```tsx
<AvatarLanguageFlag languageCode={option.code} />
<span>{option.name}</span>
<span className="text-muted-foreground">{option.code.toUpperCase()}</span>
```

Use this change handler:

```tsx
onValueChange={(value) => {
  const selectedVoice = voices.find((voice) => voice.id === selectedVoiceId);
  setLanguage(value);
  if (selectedVoice?.language !== value) setSelectedVoiceId('');
}}
```

Render `AvatarVoicePickerDialog` after Language and pass the complete voice list plus selected language.

- [ ] **Step 5: Replace duplicated media and page audio**

Use `AvatarPreviewMedia` in `AvatarChoice` and `SelectedAvatarSummary`. Remove the page imports/state/refs/functions for `Play`, `Square`, audio, preview caching, request invalidation, toggle preview, and stop preview. Remove the bottom Preview voice button, leaving only Save changes or Create embed link.

- [ ] **Step 6: Align loading and empty states**

Keep two field skeletons and one final-action skeleton. If `languages.length === 0`, show shared Empty with title `No languages available` and description `There are no supported languages available yet.` The voice dialog owns the no-compatible-voices Empty state.

- [ ] **Step 7: Run setup GREEN verification**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarVoicePickerDialog.test.ts src/components/avatar/AvatarLanguageFlag.test.ts
```

Expected: all focused UI contracts pass.

---

### Task 6: Verify the complete integration without deployment

**Files:**
- Verify: `convex/avatarProvider.ts`
- Verify: `convex/avatarEmbed.ts`
- Verify: `src/pages/AvatarCreatePage.tsx`
- Verify: all new files under `src/components/avatar/`

**Interfaces:**
- Produces: test, type, lint, build, and file-boundary evidence without credentials or deployment.

- [ ] **Step 1: Run focused Avatar tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run convex/avatarProvider.test.ts convex/avatar.test.ts src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarVoicePickerDialog.test.ts src/components/avatar/AvatarLanguageFlag.test.ts src/components/avatar/voicePreviewController.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run Convex TypeScript and scoped ESLint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -p convex/tsconfig.json --noEmit && bunx eslint convex/avatarProvider.ts convex/avatarEmbed.ts convex/avatarProvider.test.ts src/pages/AvatarCreatePage.tsx src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarLanguageFlag.tsx src/components/avatar/AvatarLanguageFlag.test.ts src/components/avatar/AvatarPreviewMedia.tsx src/components/avatar/AvatarVoicePickerDialog.tsx src/components/avatar/AvatarVoicePickerDialog.test.ts src/components/avatar/voicePreviewController.ts src/components/avatar/voicePreviewController.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 3: Run the production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite finish successfully; the existing large-chunk warning is allowed.

- [ ] **Step 4: Run full regression suites**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && TMPDIR=/private/tmp BUN_TMPDIR=/private/tmp bunx vitest run src convex shared && node --test kilobot-docs/tests/help-center-brand.test.mjs kilobot-docs/tests/help-center-structure.test.mjs
```

Expected: all application and Node-native docs tests pass.

- [ ] **Step 5: Enforce module and whitespace boundaries**

```bash
wc -l convex/avatarProvider.ts convex/avatarEmbed.ts src/pages/AvatarCreatePage.tsx src/components/avatar/AvatarLanguageFlag.tsx src/components/avatar/AvatarPreviewMedia.tsx src/components/avatar/AvatarVoicePickerDialog.tsx src/components/avatar/voicePreviewController.ts
git diff --check
```

Expected: every code module is at or below 300 lines and the diff is clean.

- [ ] **Step 6: Record the external boundary**

Do not call LiveAvatar when `LIVEAVATAR_API_KEY` and explicit `HEYGEN_SANDBOX_MODE=true` are unavailable. Report language catalog, preview audio, and Embed V2 runtime behavior as ready for Sandbox Mode verification rather than claiming a live provider pass.

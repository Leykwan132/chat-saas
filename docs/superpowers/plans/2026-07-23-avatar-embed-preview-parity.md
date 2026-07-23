# Avatar Embed Preview Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/avatar/embed/:publicKey` render the same configured preview image, `Start Chat`, mute/unmute, and end-chat experience as the dashboard preview.

**Architecture:** Extend the existing public Avatar configuration query with the optional public preview image URL, then replace the duplicate embed-page session UI with the shared `AvatarVideoStage`. The shared stage remains the only owner of session presentation and controls; the public route retains its existing feature gate and unavailable state.

**Tech Stack:** Convex, React 19, TypeScript, React Router, Vitest, Bun, Vite

## Global Constraints

- `AvatarEmbedPage` must render the existing `AvatarVideoStage`.
- The configured preview image must come from `config.avatarPreviewUrl`.
- The idle action copy remains exactly `Start Chat`.
- Active controls remain exactly mute/unmute and end chat.
- The duplicate `Talk with KiloBot` card and `Start conversation` action must be removed.
- `avatar.publicGetConfig` must expose no provider API key, session token, internal avatar identifier, voice identifier, prompt, or workspace identity.
- Missing, disabled, or invalid configurations continue rendering `AvatarUnavailableState`.
- `enable_avatar_feature` continues gating the public route.
- The generated HTML and React iframe snippets remain unchanged.
- No deployment or production feature-flag change is authorized.
- Node.js v22 must be selected in every script or test command.
- No code file may exceed 300 lines.
- Do not add comments unless the code cannot be made self-explanatory.

---

### Task 1: Expose the Configured Preview Image Publicly

**Files:**
- Modify: `convex/avatar.test.ts`
- Modify: `convex/avatar.ts`

**Interfaces:**
- Consumes: `avatarConfigurations.avatarPreviewUrl?: string` and `api.avatar.publicGetConfig({ publicKey: string })`.
- Produces: `publicGetConfig` result `null | { publicKey: string; language: string; avatarPreviewUrl?: string }`.

- [ ] **Step 1: Write the failing public-query regression**

In `convex/avatar.test.ts`, change the configured public-query assertion to:

```ts
expect(await t.query(api.avatar.publicGetConfig, {
  publicKey: initial.publicKey,
})).toEqual({
  publicKey: initial.publicKey,
  language: 'en',
  avatarPreviewUrl: 'https://example.com/avatar.png',
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatar.test.ts
```

Expected: FAIL because `publicGetConfig` omits `avatarPreviewUrl`.

- [ ] **Step 3: Add the public result validator and preview URL**

Replace `publicGetConfig` in `convex/avatar.ts` with:

```ts
export const publicGetConfig = query({
  args: { publicKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      publicKey: v.string(),
      language: v.string(),
      avatarPreviewUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const configuration = await ctx.db
      .query('avatarConfigurations')
      .withIndex('by_publicKey', (q) => q.eq('publicKey', args.publicKey))
      .unique();
    if (!configuration?.enabled) return null;
    return {
      publicKey: configuration.publicKey,
      language: configuration.language,
      ...(configuration.avatarPreviewUrl
        ? { avatarPreviewUrl: configuration.avatarPreviewUrl }
        : {}),
    };
  },
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatar.test.ts
```

Expected: PASS with all `convex/avatar.test.ts` tests green.

- [ ] **Step 5: Commit the public configuration change**

```bash
git add convex/avatar.ts convex/avatar.test.ts
git commit -m "Expose Avatar preview to public embed"
```

---

### Task 2: Render the Shared Avatar Stage in the Iframe

**Files:**
- Modify: `src/pages/AvatarEmbedPage.test.ts`
- Modify: `src/pages/AvatarEmbedPage.tsx`
- Verify: `src/components/avatar/AvatarVideoStage.tsx`
- Verify: `src/components/avatar/AvatarVideoStage.test.ts`

**Interfaces:**
- Consumes: `AvatarVideoStage({ publicKey, previewUrl }: { publicKey: string; previewUrl?: string })` and the Task 1 public configuration result.
- Produces: `/avatar/embed/:publicKey` with the same shared idle preview and active session controls as the dashboard page.

- [ ] **Step 1: Replace the duplicate-UI contract with shared-stage parity**

In `src/pages/AvatarEmbedPage.test.ts`, replace the existing
`starts only from a visitor action and uses verbatim speech` test with:

```ts
it('reuses the dashboard video stage with the configured preview image', () => {
  expect(source).toContain(
    "import { AvatarVideoStage } from '@/components/avatar/AvatarVideoStage';",
  );
  expect(source).toContain('<AvatarVideoStage');
  expect(source).toContain('publicKey={publicKey}');
  expect(source).toContain('previewUrl={config.avatarPreviewUrl}');
  expect(source).not.toContain('useAvatarSession(publicKey)');
  expect(source).not.toContain('Talk with KiloBot');
  expect(source).not.toContain('Start conversation');
  expect(source).not.toContain('<video');
  expect(settingsSource).toContain('<AvatarVideoStage');
  expect(settingsSource).toContain(
    'previewUrl={configuration.avatarPreviewUrl}',
  );
});

it('keeps visitor-started sessions and verbatim speech in the shared runtime', () => {
  expect(sessionHookSource).toContain('api.avatarSession.begin');
  expect(sessionHookSource).toContain('api.avatarConversation.receiveTranscript');
  expect(sessionHookSource).toContain('api.avatarConversation.listMessages');
  expect(runtimeSource).toContain('this.client.repeat(');
  expect(source).not.toContain('.message(');
});
```

Add these assertions to the shared-stage parity test:

```ts
const stageSource = readFileSync(
  new URL('../components/avatar/AvatarVideoStage.tsx', import.meta.url),
  'utf8',
);

expect(stageSource).toContain('Start Chat');
expect(stageSource).toContain('Mute microphone');
expect(stageSource).toContain('Unmute microphone');
expect(stageSource).toContain('End chat');
```

- [ ] **Step 2: Run the focused page and stage tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarVideoStage.test.ts
```

Expected: FAIL because `AvatarEmbedPage` still owns a duplicate video,
`Start conversation`, and session controls instead of rendering
`AvatarVideoStage`.

- [ ] **Step 3: Replace the duplicate embed UI with the shared stage**

Replace `src/pages/AvatarEmbedPage.tsx` with:

```tsx
import { useQuery } from 'convex/react';
import { useParams } from 'react-router';
import { api } from '../../convex/_generated/api';
import { AvatarUnavailableState } from '@/components/avatar/AvatarUnavailableState';
import { AvatarVideoStage } from '@/components/avatar/AvatarVideoStage';
import { Spinner } from '@/components/ui/spinner';

export default function AvatarEmbedPage() {
  const { publicKey = '' } = useParams();
  const config = useQuery(api.avatar.publicGetConfig, { publicKey });

  if (config === undefined) {
    return (
      <div className="flex size-full min-h-80 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (config === null) return <AvatarUnavailableState />;

  return (
    <main className="w-full">
      <AvatarVideoStage
        publicKey={publicKey}
        previewUrl={config.avatarPreviewUrl}
      />
    </main>
  );
}
```

- [ ] **Step 4: Run the focused page and stage tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarVideoStage.test.ts convex/avatar.test.ts
```

Expected: PASS with the embed, stage, and public-query tests green.

- [ ] **Step 5: Run the Avatar regression suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts src/router/AvatarFeatureRoutes.test.ts convex/avatar*.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarPage.test.ts src/pages/AvatarEmbedPage.test.ts src/components/avatar/*.test.ts
```

Expected: PASS with no failed Avatar tests.

- [ ] **Step 6: Verify lint, Convex types, production build, and scope**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint convex/avatar.ts convex/avatar.test.ts src/pages/AvatarEmbedPage.tsx src/pages/AvatarEmbedPage.test.ts src/components/avatar/AvatarVideoStage.tsx src/components/avatar/AvatarVideoStage.test.ts
```

Expected: exit 0 with no lint errors.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx tsc -p convex/tsconfig.json --noEmit
```

Expected: exit 0 with no Convex TypeScript errors.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: exit 0 from `tsc -b && vite build`.

Run:

```bash
git diff --check
wc -l convex/avatar.ts convex/avatar.test.ts src/pages/AvatarEmbedPage.tsx src/pages/AvatarEmbedPage.test.ts
rg -n "Talk with KiloBot|Start conversation|useAvatarSession|<video" src/pages/AvatarEmbedPage.tsx
```

Expected: no whitespace errors, every code file is at most 300 lines, and
the stale duplicate-UI scan returns no matches.

- [ ] **Step 7: Commit the shared embed experience**

```bash
git add src/pages/AvatarEmbedPage.tsx src/pages/AvatarEmbedPage.test.ts
git commit -m "Share Avatar preview with public embed"
```

## Completion Criteria

- The public iframe initially shows the configured avatar preview image.
- Its idle action is the shared bottom-center `Start Chat`.
- Active sessions show the shared mute/unmute and end-chat controls.
- `AvatarEmbedPage` contains no duplicate session hook, video, or controls.
- Disabled and invalid embeds still render the shared unavailable state.
- The public query exposes only the optional preview URL in addition to its
  existing public fields.
- Generated HTML and React snippets are unchanged.
- No deployment or feature-flag change runs.

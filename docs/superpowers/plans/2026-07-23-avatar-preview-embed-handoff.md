# Avatar Preview and Embed Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a labeled custom Avatar preview and a right-side copyable KiloBot iframe snippet to the configured Avatar home page.

**Architecture:** Keep `AvatarVideoStage` responsible for the live custom preview and repurpose `AvatarEmbedCard` into a focused public-key embed panel. `AvatarPage` composes both in a responsive grid, while the existing `/avatar/embed/:publicKey` route remains the complete custom UI loaded by the iframe.

**Tech Stack:** React 19, TypeScript, React Router, Sonner, Lucide, Vitest, Bun, Vite

## Global Constraints

- The preview heading is exactly `Preview`.
- The embed-panel heading is exactly `Embed on your website`.
- The embed snippet comes from `buildAvatarEmbedSnippet(publicKey)`.
- The configured page never reads `configuration.embedUrl`.
- The configured page never calls `buildProviderEmbedSnippet`.
- The iframe must load `/avatar/embed/:publicKey` with microphone and autoplay permission and a responsive 16:9 aspect ratio.
- The preview is the dominant left column; the embed panel is a bounded right column on large screens and stacks below on narrow screens.
- `enable_avatar_feature` gates the dashboard page and public embed according to `2026-07-23-avatar-feature-flag.md`.
- Node.js v22 must be selected in every script or test command.
- No code file may exceed 300 lines.
- Do not add comments unless the code cannot be made self-explanatory.

---

### Task 1: Compose the Preview and Custom Website Embed

**Files:**
- Modify: `src/components/avatar/AvatarEmbedCard.tsx`
- Create: `src/components/avatar/AvatarEmbedCard.test.ts`
- Modify: `src/pages/AvatarPage.tsx`
- Modify: `src/pages/AvatarPage.test.ts`
- Test: `src/lib/avatarEmbed.test.ts`

**Interfaces:**
- Consumes: `buildAvatarEmbedSnippet(publicKey: string): string`, `AvatarVideoStage({ publicKey, previewUrl })`, and `configuration.publicKey`.
- Produces: `AvatarEmbedCard({ publicKey }: { publicKey: string })` and the configured page's responsive preview/embed composition.

- [ ] **Step 1: Write the failing embed-panel contract**

Create `src/components/avatar/AvatarEmbedCard.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('./AvatarEmbedCard.tsx', import.meta.url),
  'utf8',
);

describe('Avatar website embed panel', () => {
  it('builds the complete custom iframe from the public key', () => {
    expect(source).toContain('publicKey: string');
    expect(source).toContain('buildAvatarEmbedSnippet(publicKey)');
    expect(source).not.toContain('embedUrl: string');
    expect(source).not.toContain('buildProviderEmbedSnippet');
  });

  it('shows and copies the exact generated snippet', () => {
    expect(source).toContain('Embed on your website');
    expect(source).toContain('{snippet}');
    expect(source).toContain('navigator.clipboard.writeText(snippet)');
    expect(source).toContain('Embed code copied');
    expect(source).toContain('Could not copy embed code');
  });
});
```

Replace the configured-page assertions in `src/pages/AvatarPage.test.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('./AvatarPage.tsx', import.meta.url), 'utf8');
const stageSource = readFileSync(
  new URL('../components/avatar/AvatarVideoStage.tsx', import.meta.url),
  'utf8',
);
const embedSource = readFileSync(
  new URL('../components/avatar/AvatarEmbedCard.tsx', import.meta.url),
  'utf8',
);

describe('Avatar configured overview', () => {
  it('presents the labeled custom preview beside the website embed handoff', () => {
    expect(pageSource).toContain('sm:flex-row sm:items-start sm:justify-between');
    expect(pageSource).toContain('Edit avatar');
    expect(pageSource).toContain('configuration.configured && canManage ?');
    expect(pageSource).toContain('configuration.configured ?');
    expect(pageSource).toContain('lg:grid-cols-[minmax(0,1fr)_22rem]');
    expect(pageSource).toContain('>Preview</h2>');
    expect(pageSource).toContain('<AvatarVideoStage');
    expect(pageSource).toContain('<AvatarEmbedCard publicKey={configuration.publicKey} />');
    expect(pageSource.indexOf('<AvatarVideoStage')).toBeLessThan(
      pageSource.indexOf('<AvatarEmbedCard'),
    );
  });

  it('embeds the KiloBot public route instead of a provider iframe', () => {
    expect(pageSource).not.toContain('configuration.embedUrl');
    expect(embedSource).toContain('buildAvatarEmbedSnippet(publicKey)');
    expect(embedSource).not.toContain('buildProviderEmbedSnippet');
    expect(stageSource).not.toContain('embedUrl');
    expect(stageSource).not.toContain('<iframe');
  });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedCard.test.ts src/pages/AvatarPage.test.ts src/lib/avatarEmbed.test.ts
```

Expected: FAIL because `AvatarEmbedCard` still consumes a provider URL and the page does not render the two-column handoff.

- [ ] **Step 3: Repurpose the embed panel for the KiloBot public route**

Replace `src/components/avatar/AvatarEmbedCard.tsx` with:

```tsx
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { buildAvatarEmbedSnippet } from '@/lib/avatarEmbed';
import { Button } from '@/components/ui/button';

export function AvatarEmbedCard({ publicKey }: { publicKey: string }) {
  const snippet = buildAvatarEmbedSnippet(publicKey);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success('Embed code copied');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not copy embed code',
      );
    }
  };

  return (
    <section className="flex h-fit flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Embed on your website</h2>
        <p className="text-sm text-muted-foreground">
          Copy and paste this code into your website to add the complete Avatar experience.
        </p>
      </div>
      <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <Button variant="outline" className="w-full" onClick={() => void copySnippet()}>
        <Copy data-icon="inline-start" />
        Copy code
      </Button>
    </section>
  );
}
```

- [ ] **Step 4: Compose the configured home-page layout**

Import the embed panel in `src/pages/AvatarPage.tsx`:

```ts
import { AvatarEmbedCard } from '@/components/avatar/AvatarEmbedCard';
```

Replace the configured branch with:

```tsx
{configuration.configured ? (
  <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-sm font-semibold">Preview</h2>
      <AvatarVideoStage
        publicKey={configuration.publicKey}
        previewUrl={configuration.avatarPreviewUrl}
      />
    </section>
    <AvatarEmbedCard publicKey={configuration.publicKey} />
  </div>
) : (
  <Empty className="min-h-[420px] border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><ScanFace /></EmptyMedia>
      <EmptyTitle>No avatar yet</EmptyTitle>
      <EmptyDescription>
        Choose an avatar and voice to start live conversations. You can edit both later.
      </EmptyDescription>
    </EmptyHeader>
    {canManage ? (
      <EmptyContent>
        <Button asChild>
          <Link to={`/dashboard/${typedAgentId}/avatar/create`}>Create avatar</Link>
        </Button>
      </EmptyContent>
    ) : null}
  </Empty>
)}
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedCard.test.ts src/pages/AvatarPage.test.ts src/lib/avatarEmbed.test.ts
```

Expected: All focused tests pass.

- [ ] **Step 6: Run feature-flag and Avatar regression verification**

Execute this plan after `2026-07-23-avatar-feature-flag.md`, then run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts src/router/AvatarFeatureRoutes.test.ts convex/avatar*.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarPage.test.ts src/pages/AvatarEmbedPage.test.ts src/components/avatar/*.test.ts
```

Expected: Every feature-flag and Avatar test passes.

- [ ] **Step 7: Run lint, build, stale-provider scans, and line checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts src/pages/AvatarPage.tsx src/pages/AvatarPage.test.ts src/lib/avatarEmbed.ts src/lib/avatarEmbed.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
! rg -n 'configuration\\.embedUrl|buildProviderEmbedSnippet' src/pages/AvatarPage.tsx src/components/avatar/AvatarEmbedCard.tsx
wc -l src/components/avatar/AvatarEmbedCard.tsx src/pages/AvatarPage.tsx src/lib/avatarEmbed.ts
```

Expected: Exit 0, no provider embed dependency remains in the configured handoff, and every code file is at or below 300 lines.

- [ ] **Step 8: Commit the preview/embed handoff**

```bash
git add src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts src/pages/AvatarPage.tsx src/pages/AvatarPage.test.ts
git commit -m "Add Avatar website embed handoff"
```

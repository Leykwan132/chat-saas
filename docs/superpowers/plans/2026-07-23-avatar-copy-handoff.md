# Avatar Copy Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the configured Avatar overview card with a borderless copy-and-paste handoff and a permission-aware Edit avatar action in the page header.

**Architecture:** `AvatarPage` keeps page-state selection and owns the responsive header plus edit navigation. `AvatarEmbedCard` becomes a focused presentation component that accepts only an embed URL, builds the existing snippet, explains how to install it, and copies it. Existing Convex enablement and public embed behavior remain unchanged.

**Tech Stack:** React 18, TypeScript, React Router, Convex React, shadcn Button, Tailwind CSS, Vitest source contracts, Sonner

## Global Constraints

- Run every script and test under Node v22 in the same shell execution sequence.
- Keep every code file below 300 lines.
- Add no code comments.
- Use existing shadcn primitives and semantic color tokens.
- Do not change Convex enablement persistence, the generated embed snippet, Avatar creation/edit fields, or the public embed runtime.
- Do not deploy.
- Preserve unrelated and pre-existing uncommitted workspace changes.

---

### Task 1: Configured Avatar Copy Handoff

**Files:**
- Create: `src/pages/AvatarPage.test.ts`
- Modify: `src/pages/AvatarPage.tsx`
- Modify: `src/components/avatar/AvatarEmbedCard.tsx`

**Interfaces:**
- Consumes: `buildProviderEmbedSnippet(embedUrl: string): string`, `configuration.embedUrl`, `canManage`, and the existing `/dashboard/:agentId/avatar/create` route.
- Produces: `AvatarEmbedCard({ embedUrl }: { embedUrl: string })`, a responsive permission-aware page-header edit action, and a configured-state copy instruction above the embed snippet.

- [ ] **Step 1: Write the failing configured-overview source contract**

Create `src/pages/AvatarPage.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('./AvatarPage.tsx', import.meta.url), 'utf8');
const handoffSource = readFileSync(
  new URL('../components/avatar/AvatarEmbedCard.tsx', import.meta.url),
  'utf8',
);

describe('Avatar configured overview', () => {
  it('presents a borderless copy handoff with edit navigation in the page header', () => {
    expect(pageSource).toContain('sm:flex-row sm:items-start sm:justify-between');
    expect(pageSource).toContain('Edit avatar');
    expect(pageSource).toContain('configuration.embedUrl && canManage ?');
    expect(pageSource).not.toContain('updateSettings');
    expect(pageSource).not.toContain('enabledOverride');
    expect(pageSource).not.toContain('onEnabledChange');

    const instruction = 'Copy and paste this code into your website to add your avatar.';
    expect(handoffSource).toContain(instruction);
    expect(handoffSource.indexOf(instruction)).toBeLessThan(handoffSource.indexOf('<pre'));
    expect(handoffSource).toContain('Embed code copied');
    expect(handoffSource).toContain('embedUrl: string');
    expect(handoffSource).not.toContain('<Card');
    expect(handoffSource).not.toContain('<iframe');
    expect(handoffSource).not.toContain('Website embed');
    expect(handoffSource).not.toContain('avatarName');
    expect(handoffSource).not.toContain('voiceName');
    expect(handoffSource).not.toContain('Enabled');
    expect(handoffSource).not.toContain('<Switch');
    expect(handoffSource).not.toContain('agentId');
    expect(handoffSource).not.toContain('canManage');
    expect(handoffSource).not.toContain('onEnabledChange');
  });
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AvatarPage.test.ts
```

Expected: FAIL because the page still contains enablement wiring and the handoff still renders Card, iframe, Website embed, and Switch UI without the approved instruction.

- [ ] **Step 3: Check the current shadcn Button API**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx --bun shadcn@latest docs button
```

Expected: Exit 0 and return the current Button documentation URLs. Confirm the existing `variant="outline"`, `size="sm"`, `size="icon"`, and `asChild` APIs remain valid before editing.

- [ ] **Step 4: Reduce the configured handoff to instruction, code, and copy action**

Replace `src/components/avatar/AvatarEmbedCard.tsx` with:

```tsx
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { buildProviderEmbedSnippet } from '@/lib/avatarEmbed';
import { Button } from '@/components/ui/button';

export function AvatarEmbedCard({ embedUrl }: { embedUrl: string }) {
  const snippet = buildProviderEmbedSnippet(embedUrl);

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Copy and paste this code into your website to add your avatar.
      </p>
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 pr-12 text-xs whitespace-pre-wrap">
          {snippet}
        </pre>
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1"
          onClick={() => void navigator.clipboard.writeText(snippet).then(() => toast.success('Embed code copied'))}
        >
          <Copy />
          <span className="sr-only">Copy embed code</span>
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Move Edit avatar into the page header and remove enablement wiring**

In `src/pages/AvatarPage.tsx`:

- Import `Pencil` with `ScanFace`.
- Remove `useState`, `toast`, `updateSettings`, `enabledOverride`, and `toggleEnabled`.
- Replace the current title block with this responsive header:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-semibold">Avatar</h1>
      <Badge variant="secondary" className="bg-muted text-muted-foreground">Beta</Badge>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">
      Give visitors a face and voice for live conversations with KiloBot.
    </p>
  </div>
  {configuration.embedUrl && canManage ? (
    <Button variant="outline" size="sm" asChild>
      <Link to={`/dashboard/${typedAgentId}/avatar/create`}>
        <Pencil data-icon="inline-start" />
        Edit avatar
      </Link>
    </Button>
  ) : null}
</div>
```

Render the configured handoff with only its embed URL:

```tsx
{configuration.embedUrl ? (
  <AvatarEmbedCard embedUrl={configuration.embedUrl} />
) : (
  <Empty className="min-h-[420px] border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><ScanFace /></EmptyMedia>
      <EmptyTitle>No avatar yet</EmptyTitle>
      <EmptyDescription>
        Choose an avatar and voice to create your website embed. You can edit both later.
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

- [ ] **Step 6: Run the focused contract and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/AvatarPage.test.ts
```

Expected: 1 test passes.

- [ ] **Step 7: Run focused Avatar regression verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run convex/avatar*.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarPage.test.ts src/pages/AvatarEmbedPage.test.ts src/components/avatar/*.test.ts
```

Expected: All focused Avatar test files and tests pass with zero failures.

- [ ] **Step 8: Run lint, whitespace, stale-source, and line-count checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/pages/AvatarPage.tsx src/pages/AvatarPage.test.ts src/components/avatar/AvatarEmbedCard.tsx && git diff --check && ! rg -n "Website embed|avatar-enabled|Allow visitors to use this embed|updateSettings|enabledOverride|onEnabledChange|<iframe|<Switch" src/pages/AvatarPage.tsx src/components/avatar/AvatarEmbedCard.tsx && wc -l src/pages/AvatarPage.tsx src/pages/AvatarPage.test.ts src/components/avatar/AvatarEmbedCard.tsx
```

Expected: Exit 0, no stale configured-overview references, and every touched code file is below 300 lines.

- [ ] **Step 9: Review the working-tree diff without committing shared Avatar files**

Run:

```bash
git diff -- src/pages/AvatarPage.tsx src/pages/AvatarPage.test.ts src/components/avatar/AvatarEmbedCard.tsx
```

Expected: Only the approved copy-handoff presentation and its focused contract appear. Do not commit these implementation files because they belong to the existing shared uncommitted Avatar feature unless the user separately requests a git handoff.

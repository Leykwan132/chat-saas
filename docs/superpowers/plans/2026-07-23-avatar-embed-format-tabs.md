# Avatar Embed Format Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HTML and React embed formats to the Avatar handoff with one format-aware copy button at the code surface's top-right.

**Architecture:** Keep deterministic snippet generation in `src/lib/avatarEmbed.ts`, preserving the existing HTML builder and adding a React JSX builder over the same public URL. Keep presentation state in `AvatarEmbedCard`, where shadcn Tabs choose the visible snippet and one icon-only button copies the active format.

**Tech Stack:** React 19, TypeScript, shadcn Tabs and Button, Lucide, Sonner, Vitest, Bun, Vite

## Global Constraints

- `HTML` is selected by default.
- The format controls are compact `HTML` and `React` tabs immediately above one shared code surface.
- `buildAvatarEmbedSnippet(publicKey)` remains the stable HTML builder.
- `buildAvatarReactEmbedSnippet(publicKey)` returns valid JSX.
- Both snippets use the same encoded `/avatar/embed/:publicKey` route and `VITE_AVATAR_EMBED_BASE_URL`.
- Both snippets retain `microphone; autoplay` permissions and a responsive 16:9 presentation.
- The copy control is icon-only and sits inside the code surface at its top-right.
- The code surface reserves enough right padding to avoid overlap with the copy control.
- The full-width `Copy code` button is removed.
- Accessible labels are exactly `Copy HTML code` and `Copy React code`.
- Success feedback is exactly `HTML code copied` and `React code copied`.
- Clipboard failure feedback remains exactly `Could not copy embed code`.
- Node.js v22 must be selected in every script or test command.
- No code file may exceed 300 lines.
- Do not add comments unless the code cannot be made self-explanatory.

---

### Task 1: Add the React Embed Snippet Builder

**Files:**
- Modify: `src/lib/avatarEmbed.test.ts`
- Modify: `src/lib/avatarEmbed.ts`

**Interfaces:**
- Consumes: `avatarEmbedBaseUrl` and the encoded Avatar public route.
- Produces: `buildAvatarReactEmbedSnippet(publicKey: string): string`.

- [ ] **Step 1: Write the failing React snippet test**

Add `buildAvatarReactEmbedSnippet` to the named imports in
`src/lib/avatarEmbed.test.ts`, then add:

```ts
it('builds a React-compatible responsive iframe', () => {
  const snippet = buildAvatarReactEmbedSnippet('avatar public');

  expect(snippet).toContain('src="https://kilobot.app/avatar/embed/avatar%20public"');
  expect(snippet).toContain('allow="microphone; autoplay"');
  expect(snippet).toContain("aspectRatio: '16 / 9'");
  expect(snippet).toContain('border: 0');
  expect(snippet).not.toContain('style="');
});
```

- [ ] **Step 2: Run the helper test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/avatarEmbed.test.ts
```

Expected: FAIL because `buildAvatarReactEmbedSnippet` is not exported.

- [ ] **Step 3: Add the shared public source and React builder**

In `src/lib/avatarEmbed.ts`, add:

```ts
function avatarEmbedSource(publicKey: string) {
  return `${avatarEmbedBaseUrl}/avatar/embed/${encodeURIComponent(publicKey)}`;
}
```

Update the HTML builder and add the React builder:

```ts
export function buildAvatarEmbedSnippet(publicKey: string) {
  const source = avatarEmbedSource(publicKey);
  return `<iframe src="${source}" title="KiloBot Avatar" allow="microphone; autoplay" style="width:100%;aspect-ratio:16/9;border:0"></iframe>`;
}

export function buildAvatarReactEmbedSnippet(publicKey: string) {
  const source = avatarEmbedSource(publicKey);
  return `<iframe
  src="${source}"
  title="KiloBot Avatar"
  allow="microphone; autoplay"
  style={{
    width: '100%',
    aspectRatio: '16 / 9',
    border: 0,
  }}
/>`;
}
```

- [ ] **Step 4: Run the helper tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/avatarEmbed.test.ts
```

Expected: All `src/lib/avatarEmbed.test.ts` tests pass.

- [ ] **Step 5: Commit the snippet builder**

```bash
git add src/lib/avatarEmbed.ts src/lib/avatarEmbed.test.ts
git commit -m "Add React Avatar embed snippet"
```

---

### Task 2: Add Format Tabs and Top-Right Copy

**Files:**
- Modify: `src/components/avatar/AvatarEmbedCard.test.ts`
- Modify: `src/components/avatar/AvatarEmbedCard.tsx`

**Interfaces:**
- Consumes: `buildAvatarEmbedSnippet(publicKey: string): string`, `buildAvatarReactEmbedSnippet(publicKey: string): string`, `Tabs`, `TabsList`, `TabsTrigger`, and shadcn `Button`.
- Produces: an `AvatarEmbedCard({ publicKey }: { publicKey: string })` that switches and copies HTML or React snippets.

- [ ] **Step 1: Write the failing embed-panel interaction contracts**

Replace `src/components/avatar/AvatarEmbedCard.test.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cardSource = readFileSync(new URL('./AvatarEmbedCard.tsx', import.meta.url), 'utf8');

describe('AvatarEmbedCard', () => {
  it('offers HTML and React snippets with HTML selected by default', () => {
    expect(cardSource).toContain("useState<EmbedFormat>('html')");
    expect(cardSource).toContain('buildAvatarEmbedSnippet(publicKey)');
    expect(cardSource).toContain('buildAvatarReactEmbedSnippet(publicKey)');
    expect(cardSource).toContain('<Tabs');
    expect(cardSource).toContain('<TabsTrigger value="html">HTML</TabsTrigger>');
    expect(cardSource).toContain('<TabsTrigger value="react">React</TabsTrigger>');
    expect(cardSource).not.toContain('buildProviderEmbedSnippet');
    expect(cardSource).not.toContain('embedUrl');
  });

  it('copies the active format from the code surface top-right', () => {
    expect(cardSource).toContain('navigator.clipboard.writeText(snippet)');
    expect(cardSource).toContain('`${formatLabel} code copied`');
    expect(cardSource).toContain('Could not copy embed code');
    expect(cardSource).toContain('className="absolute right-2 top-2"');
    expect(cardSource).toContain('size="icon"');
    expect(cardSource).toContain('pr-12');
    expect(cardSource).toContain('Copy ${formatLabel} code');
    expect(cardSource).not.toContain('Copy code');
  });

  it('aligns with the preview through a borderless outer section', () => {
    expect(cardSource).toContain(
      '<section className="flex min-w-0 flex-col gap-4">',
    );
    expect(cardSource).not.toContain('rounded-xl border bg-card p-5');
  });
});
```

- [ ] **Step 2: Run the component contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedCard.test.ts
```

Expected: FAIL because the card has no format state, React builder, Tabs, or
top-right icon copy control.

- [ ] **Step 3: Implement the format-aware embed card**

Replace `src/components/avatar/AvatarEmbedCard.tsx` with:

```tsx
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildAvatarEmbedSnippet,
  buildAvatarReactEmbedSnippet,
} from '@/lib/avatarEmbed';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EmbedFormat = 'html' | 'react';

export function AvatarEmbedCard({ publicKey }: { publicKey: string }) {
  const [format, setFormat] = useState<EmbedFormat>('html');
  const snippets = {
    html: buildAvatarEmbedSnippet(publicKey),
    react: buildAvatarReactEmbedSnippet(publicKey),
  };
  const snippet = snippets[format];
  const formatLabel = format === 'html' ? 'HTML' : 'React';

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success(`${formatLabel} code copied`);
    } catch {
      toast.error('Could not copy embed code');
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="space-y-1">
        <h2 className="font-semibold">Embed on your website</h2>
        <p className="text-sm text-muted-foreground">
          Paste this iframe into your page to show the complete custom avatar experience.
        </p>
      </div>
      <div className="space-y-2">
        <Tabs
          value={format}
          onValueChange={(value) => setFormat(value as EmbedFormat)}
        >
          <TabsList aria-label="Embed format">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 pr-12 text-xs whitespace-pre-wrap break-all">
            {snippet}
          </pre>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2"
            onClick={() => void copySnippet()}
          >
            <Copy />
            <span className="sr-only">{`Copy ${formatLabel} code`}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedCard.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarPage.test.ts
```

Expected: All focused tests pass.

- [ ] **Step 5: Run scoped lint, build, and structural checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts src/lib/avatarEmbed.ts src/lib/avatarEmbed.test.ts
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
git diff --check
! rg -n 'buildProviderEmbedSnippet|embedUrl|>Copy code<' src/components/avatar/AvatarEmbedCard.tsx
wc -l src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts src/lib/avatarEmbed.ts src/lib/avatarEmbed.test.ts
```

Expected: Exit 0, no provider embed dependency or full-width copy action remains
in the card, and every touched code file is at or below 300 lines.

- [ ] **Step 6: Commit the embed-format interaction**

```bash
git add src/components/avatar/AvatarEmbedCard.tsx src/components/avatar/AvatarEmbedCard.test.ts
git commit -m "Add Avatar embed format tabs"
```

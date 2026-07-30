# Page Guidance and Knowledge Base Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add concise page descriptions, improve Configuration navigation order, and give Knowledge Base direct access to agent testing and Workflow.

**Architecture:** Introduce one small reusable page-title component for consistent title and description styling. Keep Knowledge Base behavior modular by placing its header, Workflow promotion, and responsive test layout in focused components while reusing the existing `AgentPlaygroundPanel` inline mode for testing.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Tailwind CSS 4, shadcn Button, Vitest 1.6, Bun, Node.js 22.

## Global Constraints

- Use Node.js 22 for every script and test command.
- Keep every newly created code file below 300 lines.
- Do not add default fallbacks or empty `try`/`catch` blocks.
- Do not add code comments unless a non-obvious workaround cannot be expressed through naming and structure.
- Preserve existing routes, permissions, and full-height Workflow canvas behavior.
- Do not update the production changelog because release availability is unconfirmed.

---

### Task 1: Reusable descriptive page titles

**Files:**
- Create: `src/components/PageTitleBlock.tsx`
- Modify: `src/components/agent-setup/AgentSetupHeader.tsx`
- Modify: `src/pages/ChannelsPage.tsx`
- Modify: `src/pages/SchedulePage.tsx`
- Modify: `src/pages/ServicesPage.tsx`
- Modify: `src/pages/pageHeaderChrome.test.ts`

**Interfaces:**
- Produces: `PageTitleBlock({ title, description }: { title: string; description: string }): JSX.Element`
- Consumes: existing title typography classes and muted foreground tokens.

- [x] **Step 1: Write the failing page-header tests**

Update `src/pages/pageHeaderChrome.test.ts` so the four affected sources must use `PageTitleBlock` with exact approved copy:

```ts
const descriptivePageHeaders = [
  {
    fileName: 'ChannelsPage.tsx',
    title: 'Channels',
    description: 'Connect the platforms where customers can reach your agent.',
  },
  {
    fileName: 'SchedulePage.tsx',
    title: 'Availability',
    description: 'Set when your team is available for bookings and lead assignment.',
  },
  {
    fileName: 'ServicesPage.tsx',
    title: 'Services',
    description: 'Create the services customers can book with your team.',
  },
];

test.each(descriptivePageHeaders)(
  '$fileName shows its page description',
  ({ fileName, title, description }) => {
    const source = readPage(fileName);

    expect(source).toContain('PageTitleBlock');
    expect(source).toContain(`title="${title}"`);
    expect(source).toContain(`description="${description}"`);
  },
);

test('agent setup explains Configuration', () => {
  const source = readComponent('agent-setup/AgentSetupHeader.tsx');

  expect(source).toContain('PageTitleBlock');
  expect(source).toContain('title="Configuration"');
  expect(source).toContain(
    'description="Define how your agent behaves and responds to customers."',
  );
});
```

Remove these pages from assertions that descriptions are absent. Add a source assertion for the shared component:

```ts
test('shared page title block keeps descriptions visually subordinate', () => {
  const source = readComponent('PageTitleBlock.tsx');

  expect(source).toContain('text-3xl font-semibold tracking-tight text-foreground');
  expect(source).toContain('text-sm text-muted-foreground');
});
```

- [x] **Step 2: Run the header test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/pageHeaderChrome.test.ts
```

Expected: FAIL because `PageTitleBlock` and the approved descriptions are absent.

- [x] **Step 3: Add the shared title component**

Create `src/components/PageTitleBlock.tsx`:

```tsx
type PageTitleBlockProps = {
  title: string;
  description: string;
};

export function PageTitleBlock({
  title,
  description,
}: PageTitleBlockProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="m-0 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
```

- [x] **Step 4: Replace the four existing title blocks**

Use these exact calls:

```tsx
<PageTitleBlock
  title="Configuration"
  description="Define how your agent behaves and responds to customers."
/>
```

```tsx
<PageTitleBlock
  title="Channels"
  description="Connect the platforms where customers can reach your agent."
/>
```

```tsx
<PageTitleBlock
  title="Availability"
  description="Set when your team is available for bookings and lead assignment."
/>
```

```tsx
<PageTitleBlock
  title="Services"
  description="Create the services customers can book with your team."
/>
```

Keep each page's existing header container and actions unchanged.

- [x] **Step 5: Run the header test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/pageHeaderChrome.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit the descriptive headers**

```bash
git add src/components/PageTitleBlock.tsx src/components/agent-setup/AgentSetupHeader.tsx src/pages/ChannelsPage.tsx src/pages/SchedulePage.tsx src/pages/ServicesPage.tsx src/pages/pageHeaderChrome.test.ts
git commit -m "Add concise setup page descriptions"
```

---

### Task 2: Knowledge Base placement and Workflow promotion

**Files:**
- Modify: `src/components/app-sidebar-nav.ts`
- Modify: `src/components/AppSidebarFeatureFlag.test.ts`
- Modify: `src/components/knowledge-base/KnowledgeBaseNavigation.tsx`
- Create: `src/components/knowledge-base/KnowledgeBaseNavigation.test.ts`
- Modify: `src/pages/KnowledgeBasePage.tsx`

**Interfaces:**
- Produces: `KnowledgeBaseNavigation({ activeType, onSelect, workflowHref }: { activeType: KnowledgeType; onSelect: (type: KnowledgeType) => void; workflowHref: string }): JSX.Element`
- Consumes: the current agent ID from `KnowledgeBasePage` to form `/dashboard/${agentId}/workflow`.

- [x] **Step 1: Write failing navigation-order and promotion-card tests**

Add this ordering assertion to `src/components/AppSidebarFeatureFlag.test.ts`:

```ts
test('places Knowledge Base directly below Agent Setup', () => {
  const labels = getNavItems('agent-id', {
    showSavedReplies: false,
    enableAvatarFeature: false,
  }).configuration.map((item) => item.label);

  expect(labels).toEqual([
    'Agent Setup',
    'Knowledge Base',
    'Workflow',
    'Channels',
  ]);
});
```

Create `src/components/knowledge-base/KnowledgeBaseNavigation.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const navigationSource = readFileSync(
  new URL('./KnowledgeBaseNavigation.tsx', import.meta.url),
  'utf8',
);
const pageSource = readFileSync(
  new URL('../../pages/KnowledgeBasePage.tsx', import.meta.url),
  'utf8',
);

describe('Knowledge Base Workflow promotion', () => {
  it('shows direct Workflow capability copy beneath Sources', () => {
    expect(navigationSource).toContain(
      'Need your AI agent to send images, videos, reminders, or follow-ups?',
    );
    expect(navigationSource).not.toContain('Set it up with Workflow.');
    expect(navigationSource).toContain('Try Workflow');
  });

  it('links to the current agent Workflow', () => {
    expect(navigationSource).toContain('workflowHref');
    expect(pageSource).toContain(
      'workflowHref={`/dashboard/${agentId}/workflow`}',
    );
  });
});
```

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/AppSidebarFeatureFlag.test.ts src/components/knowledge-base/KnowledgeBaseNavigation.test.ts
```

Expected: FAIL on the existing Configuration order and missing promotion card.

- [x] **Step 3: Reorder Configuration navigation**

In `src/components/app-sidebar-nav.ts`, use:

```ts
configuration: [
  { to: `/dashboard/${agentId}/agent-setup`, icon: Bot, label: 'Agent Setup', requiredPermission: Permission.AGENTS_MANAGE },
  { to: `/dashboard/${agentId}/knowledge-base`, icon: BookOpen, label: 'Knowledge Base', requiredPermission: Permission.KB_READ },
  { to: `/dashboard/${agentId}/workflow`, icon: Workflow, label: 'Workflow', requiredPermission: Permission.AGENTS_MANAGE },
  { to: `/dashboard/${agentId}/channels`, icon: Plug, label: 'Channels', requiredPermission: Permission.CHANNELS_READ },
],
```

- [x] **Step 4: Add the persistent Workflow card**

Extend `KnowledgeBaseNavigationProps` with `workflowHref: string`. Import `Link` from `react-router`, `ArrowRight` from `lucide-react`, and the existing `Button`.

Render this after `KnowledgeBaseNavGroup`:

```tsx
<aside className="rounded-xl border border-border bg-muted/40 p-4">
  <p className="text-sm font-normal leading-snug text-foreground">
    Need your AI agent to send images, videos, reminders, or follow-ups?
  </p>
  <Button asChild variant="outline" size="sm" className="mt-4 w-full">
    <Link to={workflowHref}>
      Try Workflow
      <ArrowRight className="size-4" />
    </Link>
  </Button>
</aside>
```

Pass the exact current-agent route from `KnowledgeBasePage`.

- [x] **Step 5: Run the focused tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/AppSidebarFeatureFlag.test.ts src/components/knowledge-base/KnowledgeBaseNavigation.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit navigation and promotion**

```bash
git add src/components/app-sidebar-nav.ts src/components/AppSidebarFeatureFlag.test.ts src/components/knowledge-base/KnowledgeBaseNavigation.tsx src/components/knowledge-base/KnowledgeBaseNavigation.test.ts src/pages/KnowledgeBasePage.tsx
git commit -m "Guide Knowledge Base users into Workflow"
```

---

### Task 3: Knowledge Base description and direct test drawer

**Files:**
- Create: `src/components/knowledge-base/KnowledgeBaseHeader.tsx`
- Create: `src/components/knowledge-base/KnowledgeBaseHeader.test.ts`
- Modify: `src/pages/KnowledgeBasePage.tsx`
- Modify: `src/pages/pageHeaderChrome.test.ts`

**Interfaces:**
- Produces: `KnowledgeBaseHeader({ isTestOpen, onTest }: { isTestOpen: boolean; onTest: () => void }): JSX.Element`
- Consumes: `PageTitleBlock`, the existing outlined `Button`, and `AgentPlaygroundPanel` with `mode="drawer"`.

- [x] **Step 1: Write the failing Knowledge Base header tests**

Create `src/components/knowledge-base/KnowledgeBaseHeader.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const headerSource = readFileSync(
  new URL('./KnowledgeBaseHeader.tsx', import.meta.url),
  'utf8',
);
const pageSource = readFileSync(
  new URL('../../pages/KnowledgeBasePage.tsx', import.meta.url),
  'utf8',
);

describe('Knowledge Base header', () => {
  it('explains the page and offers agent testing', () => {
    expect(headerSource).toContain('title="Knowledge Base"');
    expect(headerSource).toContain(
      'description="Add the information your agent uses to answer customers."',
    );
    expect(headerSource).toContain('Test your agent');
    expect(headerSource).toContain('variant="outline"');
  });

  it('opens the shared test drawer without changing routes', () => {
    expect(pageSource).toContain("useState(false)");
    expect(pageSource).toContain('mode="drawer"');
    expect(pageSource).toContain('open={isTestOpen}');
    expect(pageSource).toContain('onOpenChange={setIsTestOpen}');
    expect(pageSource).toContain('onTest={() => setIsTestOpen(toggleTestOpen)}');
  });
});
```

Add Knowledge Base and its exact copy to the descriptive-page assertions in `src/pages/pageHeaderChrome.test.ts`.

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/KnowledgeBaseHeader.test.ts src/pages/pageHeaderChrome.test.ts
```

Expected: FAIL because the header component, description, button, and drawer state are absent.

- [x] **Step 3: Create the Knowledge Base header**

Create `src/components/knowledge-base/KnowledgeBaseHeader.tsx`:

```tsx
import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Button } from '@/components/ui/button';

type KnowledgeBaseHeaderProps = {
  isTestOpen: boolean;
  onTest: () => void;
};

export function toggleTestOpen(current: boolean) {
  return !current;
}

export function KnowledgeBaseHeader({
  isTestOpen,
  onTest,
}: KnowledgeBaseHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
      <PageTitleBlock
        title="Knowledge Base"
        description="Add the information your agent uses to answer customers."
      />
      <Button
        type="button"
        variant="outline"
        aria-pressed={isTestOpen}
        onClick={onTest}
      >
        Test your agent
      </Button>
    </header>
  );
}
```

- [x] **Step 4: Wire the shared playground drawer**

In `KnowledgeBasePage`:

```tsx
const [isTestOpen, setIsTestOpen] = useState(false);
```

Replace the inline header with:

```tsx
<KnowledgeBaseHeader
  isTestOpen={isTestOpen}
  onTest={() => setIsTestOpen(toggleTestOpen)}
/>
```

Render beside the existing delete dialog:

```tsx
{selectedAgentId ? (
  <AgentPlaygroundPanel
    agentId={selectedAgentId}
    mode="drawer"
    open={isTestOpen}
    onOpenChange={setIsTestOpen}
  />
) : null}
```

Import `KnowledgeBaseHeader` and `AgentPlaygroundPanel`. Do not add a new agent query or duplicate playground permission logic.

- [x] **Step 5: Run the focused tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/knowledge-base/KnowledgeBaseHeader.test.ts src/pages/pageHeaderChrome.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit direct Knowledge Base testing**

```bash
git add src/components/knowledge-base/KnowledgeBaseHeader.tsx src/components/knowledge-base/KnowledgeBaseHeader.test.ts src/pages/KnowledgeBasePage.tsx src/pages/pageHeaderChrome.test.ts
git commit -m "Add direct agent testing to Knowledge Base"
```

---

### Task 4: Integrated verification and continuity

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all UI and test outputs from Tasks 1–3.
- Produces: a concise continuity receipt with verification outcome and unreleased status.

- [x] **Step 1: Run all focused tests together**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/pageHeaderChrome.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/knowledge-base/KnowledgeBaseNavigation.test.ts src/components/knowledge-base/KnowledgeBaseHeader.test.ts
```

Expected: all focused tests PASS.

- [x] **Step 2: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite production build PASS.

- [x] **Step 3: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only the approved UI, tests, plan, and continuity files are changed.

- [x] **Step 4: Update continuity**

Replace the pending Snapshot entry with one dated `2026-07-30` and tagged `[CODE]` that records:

```md
- 2026-07-30 [CODE] Configuration navigation now places Knowledge Base directly below Agent Setup; Configuration, Knowledge Base, Channels, Availability, and Services have concise functional descriptions; Knowledge Base opens the shared test chat directly and links users from a persistent Sources card to Workflow for images, videos, reminders, and follow-ups. Focused tests and the production build pass; unreleased.
```

Add the focused-test and build commands to Receipts while respecting the ledger caps.

- [x] **Step 5: Commit the continuity receipt**

```bash
git add CONTINUITY.md
git commit -m "Record page guidance verification"
```

Do not modify `kilobot-docs/docs/releases/changelog.mdx` because production availability is not confirmed.

---

Tasks 5–7 are the approved revision and supersede the drawer-specific behavior completed in Task 3.

### Task 5: Minimal Workflow promotion banner

**Files:**
- Modify: `src/components/knowledge-base/KnowledgeBaseNavigation.tsx`
- Modify: `src/components/knowledge-base/KnowledgeBaseNavigation.test.ts`

**Interfaces:**
- Consumes: the existing `KnowledgeBaseNavigation` promotion card and hosted image URL `https://storage.kilobot.app/grad-2.jpg`.
- Produces: a decorative full-width 16:9 banner above the existing promotion copy.

- [x] **Step 1: Write the failing banner contract**

Add this assertion to the existing Workflow promotion test:

```ts
it('shows the approved minimal banner above the promotion copy', () => {
  expect(navigationSource).toContain(
    'src="https://storage.kilobot.app/grad-2.jpg"',
  );
  expect(navigationSource).toContain('alt=""');
  expect(navigationSource).toContain(
    'className="aspect-video w-full object-cover"',
  );
  expect(navigationSource.indexOf('<img')).toBeLessThan(
    navigationSource.indexOf(
      'Need your AI agent to send images, videos, reminders, or follow-ups?',
    ),
  );
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/components/knowledge-base/KnowledgeBaseNavigation.test.ts
```

Expected: FAIL because the promotion card has no image.

- [x] **Step 3: Add the minimal banner**

Replace the promotion card with:

```tsx
<aside className="overflow-hidden rounded-xl border border-border bg-muted/40">
  <img
    src="https://storage.kilobot.app/grad-2.jpg"
    alt=""
    className="aspect-video w-full object-cover"
  />
  <div className="p-4">
    <p className="text-sm font-normal leading-snug text-foreground">
      Need your AI agent to send images, videos, reminders, or follow-ups?
    </p>
    <Button asChild variant="outline" size="sm" className="mt-4 w-full">
      <Link to={workflowHref}>
        Try Workflow
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  </div>
</aside>
```

Do not add an overlay, image label, gradient effect, or alternate card copy.

- [x] **Step 4: Run the test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/components/knowledge-base/KnowledgeBaseNavigation.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit the banner**

```bash
git add src/components/knowledge-base/KnowledgeBaseNavigation.tsx src/components/knowledge-base/KnowledgeBaseNavigation.test.ts
git commit -m "Add minimal Knowledge Base workflow banner"
```

---

### Task 6: In-page Knowledge Base test container

**Files:**
- Create: `src/components/knowledge-base/KnowledgeBaseTestLayout.tsx`
- Modify: `src/components/knowledge-base/KnowledgeBaseHeader.test.ts`
- Modify: `src/pages/KnowledgeBasePage.tsx`

**Interfaces:**
- Produces: `KnowledgeBaseTestLayout({ children, showTestPanel, testPanel }: { children: ReactNode; showTestPanel: boolean; testPanel: ReactNode }): JSX.Element`
- Consumes: `AgentPlaygroundPanel` with `mode="inline"`, `open={isTestOpen}`, and `onOpenChange={setIsTestOpen}`.

- [x] **Step 1: Replace the drawer test with a failing inline-layout contract**

Read the new layout source alongside the existing page source:

```ts
const testLayoutUrl = new URL('./KnowledgeBaseTestLayout.tsx', import.meta.url);
const testLayoutSource = existsSync(testLayoutUrl)
  ? readFileSync(testLayoutUrl, 'utf8')
  : '';
```

Replace the drawer assertion with:

```ts
it('opens the shared test chat as its own in-page container', () => {
  expect(pageSource).toContain(
    'const [isTestOpen, setIsTestOpen] = useState(false)',
  );
  expect(pageSource).toContain('KnowledgeBaseTestLayout');
  expect(pageSource).toContain(
    'showTestPanel={isTestOpen && Boolean(selectedAgentId)}',
  );
  expect(pageSource).toContain('mode="inline"');
  expect(pageSource).not.toContain('mode="drawer"');
  expect(pageSource).toContain('open={isTestOpen}');
  expect(pageSource).toContain('onOpenChange={setIsTestOpen}');
  expect(pageSource).toContain('isTestOpen={isTestOpen}');
  expect(pageSource).toContain('onTest={() => setIsTestOpen(toggleTestOpen)}');
  expect(headerSource).toContain('aria-pressed={isTestOpen}');
});

it('keeps Knowledge Base content intact beside the responsive test panel', () => {
  expect(testLayoutSource).toContain(
    "showTestPanel && 'xl:grid-cols-[minmax(0,1fr)_380px]'",
  );
  expect(testLayoutSource).toContain('<div className="min-w-0">{children}</div>');
  expect(testLayoutSource).toContain('{testPanel}');
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/components/knowledge-base/KnowledgeBaseHeader.test.ts
```

Expected: FAIL because Knowledge Base still uses drawer mode and the layout component does not exist.

- [x] **Step 3: Add the responsive test layout**

Create `src/components/knowledge-base/KnowledgeBaseTestLayout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type KnowledgeBaseTestLayoutProps = {
  children: ReactNode;
  showTestPanel: boolean;
  testPanel: ReactNode;
};

export function KnowledgeBaseTestLayout({
  children,
  showTestPanel,
  testPanel,
}: KnowledgeBaseTestLayoutProps) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-6',
        showTestPanel && 'xl:grid-cols-[minmax(0,1fr)_380px]',
      )}
    >
      <div className="min-w-0">{children}</div>
      {testPanel}
    </div>
  );
}
```

- [x] **Step 4: Move the playground into the Knowledge Base page flow**

Import `KnowledgeBaseTestLayout`. Keep `KnowledgeBaseHeader` above it, then wrap the existing Sources/content/storage grid:

```tsx
<KnowledgeBaseTestLayout
  showTestPanel={isTestOpen && Boolean(selectedAgentId)}
  testPanel={
    selectedAgentId ? (
      <AgentPlaygroundPanel
        agentId={selectedAgentId}
        mode="inline"
        open={isTestOpen}
        onOpenChange={setIsTestOpen}
      />
    ) : null
  }
>
  <div className="grid gap-6 lg:grid-cols-[252px_minmax(0,1fr)] xl:grid-cols-[252px_minmax(0,1fr)_280px]">
```

Keep every existing child of that grid unchanged. Immediately after its existing closing `</div>`, close the wrapper:

```tsx
</KnowledgeBaseTestLayout>
```

Remove the drawer instance after the page content. Do not change the inner Sources/content/storage grid, selected source state, delete dialog, or shared playground behavior.

- [x] **Step 5: Run the test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/components/knowledge-base/KnowledgeBaseHeader.test.ts
```

Expected: PASS.

- [x] **Step 6: Check the code-file limits**

Run:

```bash
wc -l src/pages/KnowledgeBasePage.tsx src/components/knowledge-base/KnowledgeBaseTestLayout.tsx
```

Expected: both files remain at or below 300 lines.

- [x] **Step 7: Commit the in-page tester**

```bash
git add src/components/knowledge-base/KnowledgeBaseTestLayout.tsx src/components/knowledge-base/KnowledgeBaseHeader.test.ts src/pages/KnowledgeBasePage.tsx
git commit -m "Embed agent testing in Knowledge Base"
```

---

### Task 7: Revision verification and continuity

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: Tasks 5–6 and their focused tests.
- Produces: a verified unreleased revision receipt.

- [x] **Step 1: Run all page-guidance tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/pages/pageHeaderChrome.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/knowledge-base/KnowledgeBaseNavigation.test.ts src/components/knowledge-base/KnowledgeBaseHeader.test.ts
```

Expected: all focused tests PASS.

- [x] **Step 2: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite production build PASS.

- [x] **Step 3: Review the final revision**

Run:

```bash
git diff --check
git status --short
git diff --stat HEAD~2
```

Expected: no whitespace errors; the revision is limited to the approved banner, responsive test layout, focused tests, plan, and continuity.

- [x] **Step 4: Update continuity**

Update the `2026-07-30` Snapshot and Receipts to state that the hosted banner and in-page test container are implemented, the focused tests and build pass, and the result remains unreleased.

- [x] **Step 5: Commit the verification receipt**

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-07-30-page-guidance-and-knowledge-base-actions.md
git commit -m "Record Knowledge Base layout verification"
```

Do not modify `kilobot-docs/docs/releases/changelog.mdx` because production availability is not confirmed.

---

### Task 8: Add the Workflow card title

**Files:**
- Modify: `src/components/knowledge-base/KnowledgeBaseNavigation.test.ts`
- Modify: `src/components/knowledge-base/KnowledgeBaseNavigation.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the existing persistent Workflow promotion card and its `workflowHref`.
- Produces: a semibold `text-sm` title above the existing normal-weight `text-sm` capability sentence.

- [x] **Step 1: Write the failing title-hierarchy test**

Import `createElement` from React, `renderToStaticMarkup` from `react-dom/server`, `MemoryRouter` from `react-router`, and `KnowledgeBaseNavigation`. Replace the existing headline-weight test with:

```ts
it('places the approved title above the supporting line', () => {
  const markup = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      {},
      createElement(KnowledgeBaseNavigation, {
        activeType: 'web',
        onSelect: () => undefined,
        workflowHref: '/dashboard/agent-id/workflow',
      }),
    ),
  );
  const title = 'Do More Automatically';
  const supportingLine =
    'Need your AI agent to send images, videos, reminders, or follow-ups?';

  expect(markup.indexOf(title)).toBeGreaterThan(-1);
  expect(markup.indexOf(title)).toBeLessThan(
    markup.indexOf(supportingLine),
  );
  expect(markup).toContain(
    'class="text-sm font-semibold leading-snug text-foreground"',
  );
  expect(markup).toContain(
    'class="mt-1.5 text-sm font-normal leading-snug text-foreground"',
  );
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/components/knowledge-base/KnowledgeBaseNavigation.test.ts
```

Expected: FAIL because `Do More Automatically` and the title styling are absent.

- [x] **Step 3: Add the title above the supporting line**

Replace the existing capability paragraph in `KnowledgeBaseNavigation.tsx` with:

```tsx
<p className="text-sm font-semibold leading-snug text-foreground">
  Do More Automatically
</p>
<p className="mt-1.5 text-sm font-normal leading-snug text-foreground">
  Need your AI agent to send images, videos, reminders, or follow-ups?
</p>
```

Keep the banner, `Try Workflow` action, route, card container, and button spacing unchanged.

- [x] **Step 4: Run the focused test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/components/knowledge-base/KnowledgeBaseNavigation.test.ts
```

Expected: all four tests PASS.

- [x] **Step 5: Run the page-guidance verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run --no-cache src/pages/pageHeaderChrome.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/knowledge-base/KnowledgeBaseNavigation.test.ts src/components/knowledge-base/KnowledgeBaseHeader.test.ts
git diff --check
wc -l src/components/knowledge-base/KnowledgeBaseNavigation.tsx
```

Expected: all focused tests PASS, no whitespace errors, and the production component remains at or below 300 lines.

- [x] **Step 6: Update continuity and commit**

Record the implemented title and focused verification in `CONTINUITY.md`. Do not update `kilobot-docs/docs/releases/changelog.mdx` because production availability remains unconfirmed.

```bash
git add src/components/knowledge-base/KnowledgeBaseNavigation.test.ts src/components/knowledge-base/KnowledgeBaseNavigation.tsx docs/superpowers/plans/2026-07-30-page-guidance-and-knowledge-base-actions.md CONTINUITY.md
git commit -m "Add Knowledge Base Workflow card title"
```

# Avatar Embed Widget Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent KiloBot's regular website chat widget from initializing inside `/avatar/embed/:publicKey` while preserving it on normal application and customer website routes.

**Architecture:** Add an opt-in pathname-prefix exclusion to the shared widget bootstrap and configure only KiloBot's application-shell script tag with `/avatar/embed/`. The guard runs before visitor storage, DOM creation, event listeners, or API requests; generated customer snippets remain unchanged because they do not carry the exclusion attribute.

**Tech Stack:** Static HTML, browser JavaScript, React 19, TypeScript, Vitest, Bun, Vite

## Global Constraints

- KiloBot's application-shell script tag uses exactly `data-kilobot-exclude-path-prefix="/avatar/embed/"`.
- The widget bootstrap returns before visitor state, `[data-kilobot-root]`, listeners, or network requests when the configured prefix matches.
- The exclusion prefix includes its trailing slash.
- Generated customer website-widget snippets remain byte-for-byte unchanged.
- Normal KiloBot routes continue initializing the regular website widget.
- Avatar routing, `AvatarVideoStage`, sessions, microphone behavior, and `enable_avatar_feature` remain unchanged.
- CSS-only hiding and React cleanup are not permitted.
- No deployment is authorized.
- Node.js v22 must be selected in every script or test command.
- No code file may exceed 300 lines, excluding the existing generated-style `public/widget/v1.js`.
- Do not add comments unless the code cannot be made self-explanatory.

---

### Task 1: Stop the Regular Widget Before Avatar Embed Initialization

**Files:**
- Create: `src/components/avatar/AvatarEmbedWidgetIsolation.test.ts`
- Modify: `index.html`
- Modify: `public/widget/v1.js`
- Verify: `src/components/channels/webWidgetSnippet.ts`
- Verify: `src/components/channels/webWidgetSnippet.test.ts`

**Interfaces:**
- Consumes: `HTMLScriptElement.getAttribute("data-kilobot-exclude-path-prefix")` and `window.location.pathname`.
- Produces: an opt-in early-return bootstrap guard configured only for KiloBot's own `/avatar/embed/` application route.

- [ ] **Step 1: Write the failing isolation contract**

Create `src/components/avatar/AvatarEmbedWidgetIsolation.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import widgetScript from '../../../public/widget/v1.js?raw';
import { buildWebWidgetSnippet } from '@/components/channels/webWidgetSnippet';

const appShell = readFileSync(
  new URL('../../../index.html', import.meta.url),
  'utf8',
);

describe('Avatar embed website-widget isolation', () => {
  it('opts the application widget out before Avatar embed initialization', () => {
    expect(appShell).toContain(
      'data-kilobot-exclude-path-prefix="/avatar/embed/"',
    );
    expect(widgetScript).toContain(
      'script.getAttribute("data-kilobot-exclude-path-prefix") || ""',
    );
    expect(widgetScript).toContain(
      'window.location.pathname.startsWith(excludedPathPrefix)',
    );

    const guardIndex = widgetScript.indexOf(
      'window.location.pathname.startsWith(excludedPathPrefix)',
    );
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(widgetScript.indexOf('var storageKey ='));
    expect(guardIndex).toBeLessThan(
      widgetScript.indexOf('host.setAttribute("data-kilobot-root"'),
    );
  });

  it('keeps generated customer widget snippets route-agnostic', () => {
    expect(buildWebWidgetSnippet('pub_test')).not.toContain(
      'data-kilobot-exclude-path-prefix',
    );
  });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedWidgetIsolation.test.ts src/components/channels/webWidgetSnippet.test.ts
```

Expected: FAIL because `index.html` has no exclusion attribute and the widget
bootstrap has no pathname guard.

- [ ] **Step 3: Configure KiloBot's application-shell exclusion**

Add the exclusion attribute to the existing KiloBot widget script in
`index.html`:

```html
  <script
    async
    src="https://kilobot.app/widget/v1.js"
    data-kilobot-widget="pub_9eb757fbbd9c4af8b568acb8c5fed9ad"
    data-kilobot-api="https://outstanding-rabbit-215.convex.site"
    data-kilobot-exclude-path-prefix="/avatar/embed/"
  ></script>
```

- [ ] **Step 4: Add the early-return widget bootstrap guard**

Insert this immediately after the `document.currentScript` guard in
`public/widget/v1.js`:

```js
  var excludedPathPrefix = script.getAttribute("data-kilobot-exclude-path-prefix") || "";
  if (excludedPathPrefix && window.location.pathname.startsWith(excludedPathPrefix)) return;
```

The beginning of the runtime must be:

```js
(function () {
  var script = document.currentScript;
  if (!script) return;

  var excludedPathPrefix = script.getAttribute("data-kilobot-exclude-path-prefix") || "";
  if (excludedPathPrefix && window.location.pathname.startsWith(excludedPathPrefix)) return;

  var publicKey = script.getAttribute("data-kilobot-widget") || "";
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/avatar/AvatarEmbedWidgetIsolation.test.ts src/components/channels/webWidgetSnippet.test.ts
```

Expected: PASS with all isolation and customer-snippet tests green.

- [ ] **Step 6: Run website-widget regressions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts src/components/channels/WebWidgetPlacement.test.ts src/components/channels/WebWidgetPreviewConversation.test.ts src/components/channels/WebWidgetPreviewPanel.test.ts src/components/channels/WebWidgetVisualViewport.test.ts src/components/channels/webWidgetSnippet.test.ts
```

Expected: PASS with no website-widget regressions.

- [ ] **Step 7: Run Avatar regressions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/AppSidebarAvatar.test.ts src/router/AvatarFeatureRoutes.test.ts convex/avatar*.test.ts src/lib/avatarEmbed.test.ts src/pages/AvatarPage.test.ts src/pages/AvatarEmbedPage.test.ts src/components/avatar/*.test.ts
```

Expected: PASS with no Avatar regressions.

- [ ] **Step 8: Verify lint, build, scope, and ordering**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/avatar/AvatarEmbedWidgetIsolation.test.ts
```

Expected: exit 0 with no lint errors.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: exit 0 from `tsc -b && vite build`.

Run:

```bash
git diff --check
wc -l src/components/avatar/AvatarEmbedWidgetIsolation.test.ts
rg -n "data-kilobot-exclude-path-prefix|excludedPathPrefix|data-kilobot-root" index.html public/widget/v1.js src/components/channels/webWidgetSnippet.ts
```

Expected: no whitespace errors, the new test remains below 300 lines, the
application shell and runtime contain the opt-in exclusion, and the customer
snippet builder contains no exclusion attribute.

- [ ] **Step 9: Commit the isolation change**

```bash
git add index.html public/widget/v1.js src/components/avatar/AvatarEmbedWidgetIsolation.test.ts
git commit -m "Hide website widget from Avatar embeds"
```

## Completion Criteria

- `/avatar/embed/:publicKey` creates no regular KiloBot website-widget root.
- The excluded route does not read or create a website-widget visitor ID.
- The excluded route does not load website-widget configuration or messages.
- Normal KiloBot pages retain the regular website widget.
- Generated customer snippets remain unchanged.
- The Avatar shared stage and feature gate remain unchanged.
- No deployment runs.

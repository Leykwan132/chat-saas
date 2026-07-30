# Meta SDK App ID Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Facebook JavaScript SDK from `VITE_META_APP_ID` instead of a hard-coded Meta App ID.

**Architecture:** Keep SDK initialization in `index.html` and use Vite's `%VITE_META_APP_ID%` HTML replacement syntax. Protect the deployment contract with a focused test and verify the built HTML contains the supplied environment value.

**Tech Stack:** Vite, Vitest, TypeScript, Node.js 22

## Global Constraints

- Use Node.js v22 for every script and test command.
- Do not add a fallback Meta App ID.
- Do not change the Facebook SDK version or WhatsApp Embedded Signup login options.
- Preserve user-owned worktree changes.

---

### Task 1: Environment-backed Facebook SDK initialization

**Files:**
- Create: `src/metaSdkInitialization.test.ts`
- Modify: `index.html:28-34`

**Interfaces:**
- Consumes: Vite HTML variable `%VITE_META_APP_ID%`
- Produces: `FB.init({ appId })` initialized with the build environment's Meta App ID

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('Facebook SDK initialization', () => {
  it('uses the Vite Meta App ID environment value', () => {
    expect(indexHtml).toContain("appId: '%VITE_META_APP_ID%'");
    expect(indexHtml).not.toContain("appId: '999704942713974'");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/metaSdkInitialization.test.ts
```

Expected: FAIL because `index.html` still contains the hard-coded Meta App ID.

- [ ] **Step 3: Implement the minimal change**

Change the Facebook SDK initialization in `index.html` to:

```js
FB.init({
  appId: '%VITE_META_APP_ID%',
  autoLogAppEvents: true,
  xfbml: true,
  version: 'v25.0',
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/metaSdkInitialization.test.ts
```

Expected: PASS.

- [ ] **Step 5: Verify Vite's production substitution**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && VITE_META_APP_ID=123456789 bun run build
```

Expected: build succeeds and the built `dist/index.html` initializes `FB` with `appId: '123456789'`, with no `%VITE_META_APP_ID%` placeholder remaining.

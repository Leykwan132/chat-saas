# Website Widget Scroll Compaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the closed, unfocused public Website widget input while the host page scrolls and restore it after scrolling stops.

**Architecture:** The embedded widget owns a `pageScrolling` state and a single scroll-stop timer. A passive capture-phase host-window listener changes that state, while scoped Shadow DOM CSS morphs only the closed `input_bar`; the fixed wrapper remains untouched so the mobile panel stays viewport-relative.

**Tech Stack:** Plain browser JavaScript, Shadow DOM CSS, Vitest source-contract tests, local browser verification

## Global Constraints

- Node.js 22 is required for every test or script command.
- The compact pill is exactly `132px × 40px`.
- Scroll stop is exactly `180ms`; the size transition is exactly `220ms`.
- Compaction applies only to the public `input_bar` while closed and unfocused.
- Open/focused chat, avatar layouts, backend/configuration, and dashboard preview remain unchanged.
- Never apply `transform`, `translate`, `filter`, containment, or another fixed-position containing-block trigger to `.wrap`.
- Preserve all pre-existing uncommitted widget, preview, fixture, and continuity changes.
- Keep every code file under 300 lines and add no code comments.
- Do not stage or commit product files from the shared dirty worktree.

---

### Task 1: Add scroll-state and compact-style behavior

**Files:**
- Modify: `src/components/channels/WebWidgetMobileLayout.test.ts`
- Modify: `public/widget/v1.js`

**Interfaces:**
- Consumes: `state.open`, `root.activeElement`, `barInput`, and the existing `render()` class assembly.
- Produces: `state.pageScrolling: boolean`, `state.pageScrollTimer: number`, `handlePageScroll(): void`, `clearPageScrolling(): boolean`, and the wrapper class `page-scrolling`.

- [x] **Step 1: Write the failing source-contract test**

Append this test to `src/components/channels/WebWidgetMobileLayout.test.ts`:

```ts
test('public widget compacts the closed input bar while the host page scrolls', () => {
  expect(widgetScript).toContain('pageScrolling: false');
  expect(widgetScript).toContain('pageScrollTimer: 0');
  expect(widgetScript).toContain(
    'window.addEventListener("scroll", handlePageScroll, { capture: true, passive: true })',
  );
  expect(widgetScript).toContain('function handlePageScroll()');
  expect(widgetScript).toContain('state.open || root.activeElement === barInput');
  expect(widgetScript).toContain('window.setTimeout(function ()');
  expect(widgetScript).toContain('}, 180)');
  expect(widgetScript).toContain('function clearPageScrolling()');
  expect(widgetScript).toContain('(state.pageScrolling ? " page-scrolling" : "")');
  expect(widgetScript).toContain(
    '.page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar{width:132px;height:40px',
  );
  expect(widgetScript).toContain(
    '.page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar .send{width:30px;height:30px}',
  );
  expect(widgetScript).toContain('@media(prefers-reduced-motion:reduce){.bar,.bar .send{transition:none}}');
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts --reporter=dot
```

Expected: FAIL in `public widget compacts the closed input bar while the host page scrolls` because `pageScrolling: false` is absent.

- [x] **Step 3: Add the compact CSS state**

Update the `.bar` and `.send` transitions in `public/widget/v1.js`, then add the compact and reduced-motion rules:

```js
".composer{display:flex;align-items:center;gap:8px;border-radius:999px;pointer-events:auto}.bar{width:280px;max-width:100%;height:48px;margin:0 auto;border:1px solid var(--composer-border);background:var(--composer-bg);color:var(--composer-text);box-shadow:0 2px 10px rgba(0,0,0,.1);padding:0 8px 0 24px;transition:width .22s ease-in-out,height .22s ease-in-out,padding .22s ease-in-out,gap .22s ease-in-out,box-shadow .22s ease-in-out,transform .2s ease-in-out}.wrap:focus-within .bar{width:min(92vw,430px);box-shadow:0 6px 18px rgba(0,0,0,.12);transform:translateY(-2px)}",
".page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar{width:132px;height:40px;gap:4px;padding:0 5px 0 14px;box-shadow:0 2px 8px rgba(0,0,0,.08)}.page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar .send{width:30px;height:30px}",
"input{all:unset;min-width:0;flex:1;color:var(--composer-text);font-size:14px}input::placeholder{color:var(--composer-placeholder)}.send{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:0;border-radius:999px;background:var(--send-bg);color:var(--send-text);cursor:pointer;transition:background .2s,transform .2s,width .22s ease-in-out,height .22s ease-in-out}.send:hover{background:var(--send-hover)}.send:disabled{cursor:not-allowed;opacity:.55}.send svg{width:17px;height:17px}.power{padding:0 16px 14px;text-align:center;color:rgba(255,255,255,.55);font-size:11px;line-height:12px;pointer-events:auto;opacity:0;transition:opacity .22s ease}.power a{color:rgba(255,255,255,.65);text-decoration:none}.power a:hover{color:var(--panel-text);text-decoration:underline}.open .power{opacity:1}.layout-right_avatar .power,.layout-left_avatar .power{padding-bottom:8px}",
"@media(prefers-reduced-motion:reduce){.bar,.bar .send{transition:none}}",
```

- [x] **Step 4: Add state and host-scroll handling**

Add the state fields:

```js
pageScrolling: false,
pageScrollTimer: 0,
```

Register the listener with the existing event listeners:

```js
window.addEventListener("scroll", handlePageScroll, { capture: true, passive: true });
```

Add the state functions beside the panel open/close functions:

```js
function handlePageScroll() {
  if (state.open || root.activeElement === barInput) return;
  if (!state.pageScrolling) { state.pageScrolling = true; render(); }
  if (state.pageScrollTimer) window.clearTimeout(state.pageScrollTimer);
  state.pageScrollTimer = window.setTimeout(function () {
    if (clearPageScrolling()) render();
  }, 180);
}
function clearPageScrolling() {
  if (state.pageScrollTimer) window.clearTimeout(state.pageScrollTimer);
  state.pageScrollTimer = 0;
  if (!state.pageScrolling) return false;
  state.pageScrolling = false;
  return true;
}
```

Clear the compact state whenever the panel opens:

```js
function openPanel() { clearPageScrolling(); state.open = true; startPolling(); render(); }
```

Extend wrapper class assembly without changing existing class behavior:

```js
wrap.className = "wrap" + (wrap.className.indexOf("ready") > -1 ? " ready" : "") + " theme-" + theme + " layout-" + layout + (state.open ? " open" : "") + (state.pageScrolling ? " page-scrolling" : "");
```

- [x] **Step 5: Run the focused test and confirm GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts --reporter=dot
```

Expected: all tests in the file PASS.

### Task 2: Verify integration and regression safety

**Files:**
- Verify: `public/widget/v1.js`
- Verify: `src/components/channels/WebWidgetMobileLayout.test.ts`
- Use without committing: `public/widget-launcher-check.html` or an equivalent local scrollable host fixture

**Interfaces:**
- Consumes: the `page-scrolling` runtime and CSS contract from Task 1.
- Produces: test, lint, line-count, diff, and browser evidence that the widget compacts safely.

- [x] **Step 1: Run adjacent widget tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetMobileLayout.test.ts src/components/channels/WebWidgetPlacement.test.ts src/components/channels/WebWidgetPreviewConversation.test.ts --reporter=dot
```

Expected: all tests PASS.

- [x] **Step 2: Run targeted static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/channels/WebWidgetMobileLayout.test.ts
```

Expected: exit code `0` with no lint errors.

Run:

```bash
wc -l public/widget/v1.js src/components/channels/WebWidgetMobileLayout.test.ts
```

Expected: both files are at or below 300 lines.

Run:

```bash
git diff --check -- public/widget/v1.js src/components/channels/WebWidgetMobileLayout.test.ts
```

Expected: exit code `0` with no whitespace errors.

- [x] **Step 3: Verify desktop behavior in a browser**

Start the existing local app with Node 22, open a scrollable host page using the local widget script, and verify at a desktop viewport:

```text
1. Closed and idle input measures 280×48px.
2. During host-page scrolling it measures 132×40px.
3. It restores to 280×48px 180ms after the last scroll event.
4. Clicking the compact input immediately restores and opens it.
5. The open panel remains 430×474px and does not compact while scrolling.
```

- [x] **Step 4: Verify mobile behavior in a browser**

At a `400×850` viewport, verify:

```text
1. Closed and idle input measures 236×48px.
2. During host-page scrolling it measures 132×40px.
3. It restores after the scroll-stop delay.
4. Opening from the compact input restores full width.
5. The open panel remains viewport-relative at 376×756px.
```

- [x] **Step 5: Review only the intended implementation delta**

Run:

```bash
git diff -- public/widget/v1.js src/components/channels/WebWidgetMobileLayout.test.ts
```

Expected: the new scroll state, timer, scoped compact CSS, reduced-motion rule, and focused test appear alongside the preserved pre-existing widget changes. Do not stage or commit these shared product files.

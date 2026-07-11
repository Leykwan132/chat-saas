# Website Widget Mobile Viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the public Website widget's native mobile inputs and expanded chat inside the live visual viewport when browser chrome or the software keyboard changes the usable screen.

**Architecture:** The dependency-free Shadow DOM runtime reads `window.visualViewport`, coalesces changes through `requestAnimationFrame`, and publishes clamped layout offsets as CSS variables. Mobile CSS combines those variables with safe-area insets while retaining the existing fixed-position and `100dvh` fallback.

**Tech Stack:** Vanilla JavaScript, Shadow DOM CSS, Vitest raw-script contract tests, browser layout verification

## Global Constraints

- The embed must remain dependency-free and use native `<input>` elements.
- Node v22 must be selected in every test or script command.
- `public/widget/v1.js` must remain at or below 300 lines.
- `.wrap` must not receive transform, translate, filter, containment, or another fixed-position containing-block trigger.
- Desktop sizing, scroll compaction, message behavior, and dashboard preview behavior must remain unchanged.

---

### Task 1: Lock the mobile viewport contract with failing tests

**Files:**
- Create: `src/components/channels/WebWidgetVisualViewport.test.ts`
- Test: `src/components/channels/WebWidgetVisualViewport.test.ts`

**Interfaces:**
- Consumes: the raw `public/widget/v1.js` asset through Vite's `?raw` import.
- Produces: regression assertions for native input attributes, VisualViewport synchronization, safe-area CSS, and fallback CSS.

- [ ] **Step 1: Write the failing tests**

Create focused assertions that require `visualViewport` resize/scroll listeners, an orientation listener, a request-animation-frame scheduler, clamped CSS variable writes for all four viewport edges, focus-triggered synchronization, `16px` mobile input text, safe-area-aware mobile offsets, accessible native input attributes, and the retained `100dvh` fallback.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetVisualViewport.test.ts
```

Expected: FAIL because the current widget has no VisualViewport synchronization or mobile 16px input rule.

- [ ] **Step 3: Commit the test contract with the implementation in Task 2**

Do not commit a deliberately failing revision. Carry the RED test into Task 2.

### Task 2: Implement visual viewport synchronization and native input hardening

**Files:**
- Modify: `public/widget/v1.js`
- Test: `src/components/channels/WebWidgetVisualViewport.test.ts`

**Interfaces:**
- Consumes: `window.visualViewport`, `window.requestAnimationFrame`, the existing `wrap`, `barInput`, and `panelInput` elements.
- Produces: `scheduleVisualViewportSync()` and `syncVisualViewport()` runtime functions plus `--mobile-viewport-top`, `--mobile-viewport-bottom`, `--mobile-viewport-left`, and `--mobile-viewport-right` CSS variables.

- [ ] **Step 1: Add the minimal viewport scheduler**

Add one animation-frame handle. Register passive `resize` and `scroll` listeners on `window.visualViewport`, register `orientationchange` on `window`, and schedule a measurement after either input focuses.

- [ ] **Step 2: Publish clamped viewport offsets**

In `syncVisualViewport()`, clamp `offsetTop`, `offsetLeft`, `window.innerHeight - offsetTop - height`, and `window.innerWidth - offsetLeft - width` to zero, then write pixel values to the four wrapper CSS variables.

- [ ] **Step 3: Make mobile CSS consume live offsets and safe areas**

Combine each viewport variable with `max(var(--mobile-edge), env(safe-area-inset-*, 0px))` for mobile wrapper and panel positioning. Retain the current `max-height: calc(100dvh - ...)` declaration as the no-VisualViewport fallback.

- [ ] **Step 4: Harden native mobile inputs**

Add `aria-label="Message"`, `inputmode="text"`, and `enterkeyhint="send"` to both native inputs. Add a mobile `input{font-size:16px}` rule while preserving the existing desktop 14px rule and 48px composer height.

- [ ] **Step 5: Run the focused tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetVisualViewport.test.ts src/components/channels/WebWidgetMobileLayout.test.ts
```

Expected: all focused widget tests PASS.

- [ ] **Step 6: Verify code quality and size**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/channels/WebWidgetVisualViewport.test.ts && wc -l public/widget/v1.js src/components/channels/WebWidgetVisualViewport.test.ts && git diff --check
```

Expected: ESLint and diff checks PASS; each code file is at or below 300 lines.

- [ ] **Step 7: Commit the implementation**

```bash
git add public/widget/v1.js src/components/channels/WebWidgetVisualViewport.test.ts
git commit -m "Fix mobile Website widget viewport sizing"
```

### Task 3: Verify rendered mobile geometry

**Files:**
- Modify only if required by a reproduced layout failure: `public/widget/v1.js`
- Use: `public/widget-launcher-check.html`

**Interfaces:**
- Consumes: the implemented viewport CSS variables and both public widget layouts.
- Produces: measured evidence that panel and composer stay inside reduced and full visual viewport bounds.

- [ ] **Step 1: Start the local app with Node 22**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run dev --host 127.0.0.1 --port 5178
```

Expected: Vite serves the local widget fixture.

- [ ] **Step 2: Verify input-bar geometry**

At a 390x844 mobile viewport, open the input-bar widget and confirm the composer and panel fit within the full viewport. Simulate a reduced visual viewport and confirm the composer rises above its bottom edge while the panel shrinks without overlapping the composer.

- [ ] **Step 3: Verify avatar-layout geometry**

Repeat the full and reduced viewport checks for the right-avatar layout. Confirm the panel remains usable and the native panel input stays visible.

- [ ] **Step 4: Verify landscape and restoration**

Use a representative landscape viewport, then restore portrait/full height. Confirm viewport offsets return to zero and the panel grows back without stale inline measurements.

- [ ] **Step 5: Re-run focused verification after any correction**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetVisualViewport.test.ts src/components/channels/WebWidgetMobileLayout.test.ts src/components/channels/WebWidgetPlacement.test.ts
```

Expected: all adjacent widget tests PASS.

### Task 4: Record completion and publish main

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: final test, browser, code-size, and git results.
- Produces: a bounded continuity snapshot and the published `main` branch.

- [ ] **Step 1: Update the continuity ledger**

Record the approved native-input decision, VisualViewport implementation, focused test results, rendered mobile measurements, commit, and push outcome with dated provenance tags.

- [ ] **Step 2: Run final verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetVisualViewport.test.ts src/components/channels/WebWidgetMobileLayout.test.ts src/components/channels/WebWidgetPlacement.test.ts && bunx eslint src/components/channels/WebWidgetVisualViewport.test.ts && git diff --check
```

Expected: tests, ESLint, and diff checks PASS.

- [ ] **Step 3: Commit the ledger**

```bash
git add CONTINUITY.md
git commit -m "Record mobile widget viewport fix"
```

- [ ] **Step 4: Push main**

```bash
git push origin main
```

Expected: the local `main` commit range is published to `origin/main`.

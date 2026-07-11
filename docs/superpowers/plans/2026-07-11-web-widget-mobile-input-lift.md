# Website Widget Mobile Input Lift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the public Website widget's mobile input-bar composer by 8px without moving the chat panel or avatar layouts.

**Architecture:** A dedicated CSS custom property defines the lift. A mobile `input_bar` wrapper override adds it to the existing VisualViewport and safe-area bottom calculation, leaving panel geometry untouched.

**Tech Stack:** Vanilla JavaScript Shadow DOM CSS, Vitest raw-script contract tests, rendered browser geometry verification

## Global Constraints

- Node v22 must be selected for every script or test command.
- `public/widget/v1.js` must remain at or below 300 lines.
- The lift is exactly 8px and applies only to the mobile `input_bar` wrapper.
- Panel, avatar, desktop, dashboard preview, safe-area, and VisualViewport behavior remain unchanged.

---

### Task 1: Implement and verify the mobile composer lift

**Files:**
- Modify: `public/widget/v1.js`
- Modify: `src/components/channels/WebWidgetVisualViewport.test.ts`

**Interfaces:**
- Consumes: existing `--mobile-viewport-bottom`, `--mobile-edge`, and safe-area bottom inset.
- Produces: `--mobile-input-lift:8px` and a mobile `.layout-input_bar` bottom override.

- [ ] **Step 1: Write the failing regression**

Require the widget CSS to define `--mobile-input-lift:8px` and contain `.layout-input_bar{bottom:calc(var(--mobile-viewport-bottom) + max(var(--mobile-edge),env(safe-area-inset-bottom,0px)) + var(--mobile-input-lift))}`.

- [ ] **Step 2: Verify RED**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetVisualViewport.test.ts
```

Expected: FAIL because the lift variable and scoped bottom override do not exist.

- [ ] **Step 3: Implement the minimal CSS change**

Add the 8px custom property to `.wrap`, then add the scoped mobile `input_bar` bottom calculation after the shared mobile layout rule. Do not change the panel formulas or avatar layout.

- [ ] **Step 4: Verify GREEN and adjacent behavior**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WebWidgetVisualViewport.test.ts src/components/channels/WebWidgetMobileLayout.test.ts src/components/channels/WebWidgetPlacement.test.ts
```

Expected: all focused widget tests PASS.

- [ ] **Step 5: Verify rendered geometry**

At 390×844 and with the existing simulated keyboard VisualViewport offsets, open the input-bar widget and measure a gap near 12px with no overlap. Confirm avatar geometry is unchanged.

- [ ] **Step 6: Verify quality constraints**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/channels/WebWidgetVisualViewport.test.ts && wc -l public/widget/v1.js src/components/channels/WebWidgetVisualViewport.test.ts && git diff --check
```

Expected: ESLint and diff checks PASS; both code files remain at or below 300 lines.

- [ ] **Step 7: Commit**

```bash
git add public/widget/v1.js src/components/channels/WebWidgetVisualViewport.test.ts CONTINUITY.md
git commit -m "Tighten mobile Website widget input spacing"
```

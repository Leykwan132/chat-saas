# Borderless Guide Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every visible outline and accent border from KiloBot's shared informational guide panels while preserving their semantic surfaces, rounded shapes, content hierarchy, and responsive behavior.

**Architecture:** Keep the change centralized in the four existing CSS modules so every current and future MDX use inherits the treatment without component or page edits. Extend the docs visual-system source contract before changing production styles, then verify the built pages in light, dark, desktop, and mobile presentations.

**Tech Stack:** Docusaurus 3, React 19, CSS Modules, Node 22, Bun 1.3.6, Node test runner

## Global Constraints

- Apply the borderless treatment to `DocPrerequisites`, `DocExample`, `DocSuccess`, and `DocMediaPlaceholder`.
- Keep existing Docusaurus admonitions borderless and unchanged.
- Do not change navigation cards, buttons, code blocks, the Quick Start banner, changelog controls, or other interactive or structural elements.
- Preserve existing content, accessible section semantics, margins, padding, and responsive behavior.
- Use `var(--kilobot-muted)` for prerequisite and example surfaces.
- Keep success panels green-tinted and media placeholders striped.
- Use Node 22 before every test, typecheck, or build command.
- Use Bun for KiloBot Docs commands.
- Do not add a public changelog entry because this work is unreleased.

---

### Task 1: Make every shared informational panel borderless

**Files:**
- Modify: `kilobot-docs/tests/docs-visual-system.test.mjs`
- Modify: `kilobot-docs/src/components/DocPrerequisites.module.css`
- Modify: `kilobot-docs/src/components/DocExample.module.css`
- Modify: `kilobot-docs/src/components/DocSuccess.module.css`
- Modify: `kilobot-docs/src/components/DocMediaPlaceholder.module.css`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: Existing `.root` classes exported by each CSS Module and used by the matching React component.
- Produces: The same CSS Module class names and React component interfaces, with borderless presentation only.

- [ ] **Step 1: Write the failing visual-system source contract**

Add this test to `kilobot-docs/tests/docs-visual-system.test.mjs`:

```js
test('styles every shared informational panel as a borderless rounded surface', () => {
  const panelStyles = [
    ['src/components/DocPrerequisites.module.css', 'var(--kilobot-muted)'],
    ['src/components/DocExample.module.css', 'var(--kilobot-muted)'],
    ['src/components/DocSuccess.module.css', '#16a34a'],
    ['src/components/DocMediaPlaceholder.module.css', 'repeating-linear-gradient'],
  ];

  for (const [relativePath, expectedSurface] of panelStyles) {
    const css = read(relativePath);
    const rootRule = css.match(/\.root \{[\s\S]*?\n\}/)?.[0];

    assert.ok(rootRule, `${relativePath} must define a root rule`);
    assert.doesNotMatch(rootRule, /^\s*border(?:-left)?:/m);
    assert.match(rootRule, /border-radius:/);
    assert.ok(rootRule.includes(expectedSurface));
  }
});
```

- [ ] **Step 2: Run the focused contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/docs-visual-system.test.mjs
```

Working directory: `kilobot-docs`

Expected: FAIL because all four root rules still contain `border` or `border-left`; the prerequisites rule also does not use `var(--kilobot-muted)`.

- [ ] **Step 3: Apply the minimal shared CSS changes**

In `DocPrerequisites.module.css`, remove the `border` declaration and change the root background:

```css
.root {
  margin: 1.5rem 0;
  padding: 1rem 1.125rem;
  border-radius: 0.75rem;
  background: var(--kilobot-muted);
}
```

In `DocExample.module.css`, remove `border-left` and make the existing radius apply to all corners:

```css
.root {
  margin: 1.5rem 0;
  padding: 1.125rem;
  border-radius: 0.75rem;
  background: var(--kilobot-muted);
}
```

In `DocSuccess.module.css`, remove only the root `border` declaration. Retain the `0.75rem` radius, green-tinted background, and light/dark heading colors.

In `DocMediaPlaceholder.module.css`, remove only the dashed root `border` declaration. Retain the `0.875rem` radius and complete striped background.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && node --test tests/docs-visual-system.test.mjs && bun test src/components/DocGuideComponents.test.tsx
```

Working directory: `kilobot-docs`

Expected: 3 Node-native visual-system tests and 2 rendered guide-component tests pass with zero failures.

- [ ] **Step 5: Run the full automated verification gate**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test && bun test src/components/DocGuideComponents.test.tsx && bun run typecheck && bun run build
```

Working directory: `kilobot-docs`

Then run:

```bash
git diff --check
```

Working directory: repository root.

Expected: All docs tests pass, both rendered component tests pass, TypeScript exits zero, the Docusaurus build creates the search index, and the whitespace check exits zero.

- [ ] **Step 6: Verify the built visual behavior**

Serve `kilobot-docs/build` locally and inspect a guide page containing all four shared panels, such as `/start-here/quick-start` or `/build-your-agent/agent-setup`.

At a 1920px desktop viewport in both light and dark themes, confirm:

- Prerequisite, example, success, and media-placeholder panels have computed `border-width: 0px` and `border-style: none`.
- Each panel retains its rounded corners and distinct background.
- The example panel has no left accent rule.
- Existing article and page-outline spacing remains unchanged.

At a 390px viewport, confirm:

- No horizontal overflow.
- Panel padding remains readable.
- No panel border reappears.

- [ ] **Step 7: Record the unreleased result**

Update `CONTINUITY.md` with:

- The borderless shared informational-panel decision.
- The files changed and verification evidence.
- The unreleased, unpushed, and undeployed status.

Do not edit `kilobot-docs/docs/releases/changelog.mdx`.

- [ ] **Step 8: Commit the implementation**

```bash
git add kilobot-docs/tests/docs-visual-system.test.mjs kilobot-docs/src/components/DocPrerequisites.module.css kilobot-docs/src/components/DocExample.module.css kilobot-docs/src/components/DocSuccess.module.css kilobot-docs/src/components/DocMediaPlaceholder.module.css CONTINUITY.md
git commit -m "docs: make guide panels borderless"
```

# Docs Image Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Docusaurus MDX content image expandable in an accessible full-screen lightbox with a small alt-derived caption.

**Architecture:** Swizzle Docusaurus's global `MDXComponents/Img` renderer so current and future content images inherit the behavior automatically. Keep the in-article wrapper valid inside MDX paragraphs, and portal a native `<dialog>` to `document.body` only after user interaction.

**Tech Stack:** Docusaurus 3.10.2, React 19, TypeScript 6, CSS Modules, Lucide React, Bun 1.3.6, Node.js 22

## Global Constraints

- Apply the behavior only to images rendered through Docusaurus MDX.
- Exclude navbar branding, interface icons, decorative theme assets, videos, and non-MDX images.
- Preserve lazy loading, asynchronous decoding, responsive sizing, original sources, and meaningful alt text.
- Use no third-party lightbox dependency.
- Keep every code file below 300 lines and add no code comments.
- Use a borderless image control, an 8px caption gap, and small muted caption text.
- Close the native dialog through its close button, Escape key, or backdrop selection.
- Keep the expanded image centered and constrained to the available viewport without changing its aspect ratio.
- Use Node.js 22 in the same shell invocation for every script or test.

---

### Task 1: Global MDX image renderer

**Files:**
- Create: `kilobot-docs/src/theme/MDXComponents/Img/index.tsx`
- Create: `kilobot-docs/src/theme/MDXComponents/Img/styles.module.css`
- Create: `kilobot-docs/src/theme/MDXComponents/Img/index.test.tsx`
- Modify: `kilobot-docs/tests/help-center-brand.test.mjs`

**Interfaces:**
- Consumes: Docusaurus `Props` from `@theme/MDXComponents/Img`, React's `createPortal`, and Lucide's `X` icon.
- Produces: default `MDXImg(props: Props): ReactNode`, exported `ExpandedImageDialog`, and exported `isBackdropSelection(target: EventTarget, currentTarget: EventTarget): boolean`.

- [ ] **Step 1: Write the failing renderer tests**

Create `kilobot-docs/src/theme/MDXComponents/Img/index.test.tsx`:

```tsx
import assert from 'node:assert/strict';
import {createRef} from 'react';
import {describe, test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import MDXImg, {
  ExpandedImageDialog,
  isBackdropSelection,
} from './index';

describe('MDX image lightbox', () => {
  test('renders an expandable image and alt-derived caption', () => {
    const html = renderToStaticMarkup(
      <MDXImg
        src="https://storage.kilobot.app/docs/docs-testing.png"
        alt="Test the agent"
        className="existing"
      />,
    );

    assert.ok(html.includes('aria-label="Expand image: Test the agent"'));
    assert.ok(html.includes('loading="lazy"'));
    assert.ok(html.includes('decoding="async"'));
    assert.ok(html.includes('alt="Test the agent"'));
    assert.ok(html.includes('aria-hidden="true"'));
    assert.ok(html.includes('Test the agent'));
  });

  test('renders the expanded dialog controls and image', () => {
    const html = renderToStaticMarkup(
      <ExpandedImageDialog
        dialogRef={createRef<HTMLDialogElement>()}
        src="https://storage.kilobot.app/docs/docs-testing.png"
        alt="Test the agent"
        onClose={() => undefined}
      />,
    );

    assert.ok(html.includes('<dialog'));
    assert.ok(html.includes('aria-label="Expanded image: Test the agent"'));
    assert.ok(html.includes('aria-label="Close expanded image"'));
    assert.ok(html.includes('alt="Test the agent"'));
  });

  test('closes only when the dialog backdrop is selected', () => {
    const backdrop = {};
    const image = {};

    assert.equal(isBackdropSelection(backdrop, backdrop), true);
    assert.equal(isBackdropSelection(image, backdrop), false);
  });
});
```

Add the new renderer and test paths to the explicit code-module inventory in `kilobot-docs/tests/help-center-brand.test.mjs`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun test src/theme/MDXComponents/Img/index.test.tsx
```

Expected: FAIL because `src/theme/MDXComponents/Img/index.tsx` does not exist.

- [ ] **Step 3: Implement the global renderer**

Create `kilobot-docs/src/theme/MDXComponents/Img/index.tsx` with these behaviors:

```tsx
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {createPortal} from 'react-dom';
import clsx from 'clsx';
import {X} from 'lucide-react';
import type {Props} from '@theme/MDXComponents/Img';
import styles from './styles.module.css';

type ExpandedImageDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  src?: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  onClose: () => void;
};

export function isBackdropSelection(
  target: EventTarget,
  currentTarget: EventTarget,
): boolean {
  return target === currentTarget;
}

export function ExpandedImageDialog({
  dialogRef,
  src,
  srcSet,
  sizes,
  alt,
  onClose,
}: ExpandedImageDialogProps): ReactNode {
  const label = alt?.trim() || 'Documentation image';

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (isBackdropSelection(event.target, event.currentTarget)) {
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={`Expanded image: ${label}`}
      onClick={handleBackdrop}
      onClose={onClose}
    >
      <button
        type="button"
        className={styles.close}
        aria-label="Close expanded image"
        onClick={() => dialogRef.current?.close()}
      >
        <X aria-hidden="true" />
      </button>
      <img
        className={styles.expanded}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        decoding="async"
      />
    </dialog>
  );
}

export default function MDXImg({
  className,
  alt,
  src,
  srcSet,
  sizes,
  ...props
}: Props): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const label = alt?.trim() || 'Documentation image';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!expanded || !dialog) return;
    if (typeof dialog.showModal !== 'function') {
      setExpanded(false);
      return;
    }
    dialog.showModal();
  }, [expanded]);

  return (
    <span className={styles.root} role="group">
      <button
        type="button"
        className={styles.trigger}
        aria-label={`Expand image: ${label}`}
        onClick={() => setExpanded(true)}
      >
        <img
          decoding="async"
          loading="lazy"
          {...props}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          className={clsx(styles.image, className)}
        />
      </button>
      {alt?.trim() ? (
        <span className={styles.caption} aria-hidden="true">{alt}</span>
      ) : null}
      {expanded && typeof document !== 'undefined'
        ? createPortal(
            <ExpandedImageDialog
              dialogRef={dialogRef}
              src={src}
              srcSet={srcSet}
              sizes={sizes}
              alt={alt}
              onClose={() => setExpanded(false)}
            />,
            document.body,
          )
        : null}
    </span>
  );
}
```

- [ ] **Step 4: Add borderless responsive styling**

Create `kilobot-docs/src/theme/MDXComponents/Img/styles.module.css`:

```css
.root {
  display: block;
  margin: 1.5rem 0;
}

.trigger {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 0.75rem;
  background: transparent;
  cursor: zoom-in;
}

.trigger:focus-visible {
  outline: 2px solid var(--ifm-color-primary);
  outline-offset: 3px;
}

.image {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  border: 0;
  border-radius: 0.75rem;
  transition: opacity 150ms ease;
}

.trigger:hover .image {
  opacity: 0.92;
}

.caption {
  display: block;
  margin-top: 0.5rem;
  color: var(--ifm-font-color-secondary);
  font-size: 0.8125rem;
  line-height: 1.4;
  text-align: center;
}

.dialog {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 1.5rem;
  border: 0;
  background: transparent;
  overflow: hidden;
}

.dialog[open] {
  display: grid;
  place-items: center;
}

.dialog::backdrop {
  background: rgb(0 0 0 / 86%);
}

.expanded {
  display: block;
  max-width: calc(100vw - 3rem);
  max-height: calc(100dvh - 3rem);
  margin: auto;
  object-fit: contain;
}

.close {
  position: fixed;
  top: 1rem;
  right: 1rem;
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  place-items: center;
  background: rgb(24 24 27 / 82%);
  color: white;
  cursor: pointer;
}

.close:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.close svg {
  width: 1.125rem;
  height: 1.125rem;
}

@media (prefers-reduced-motion: reduce) {
  .image {
    transition: none;
  }
}
```

- [ ] **Step 5: Run focused tests and type checking**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun test src/theme/MDXComponents/Img/index.test.tsx && bun run typecheck
```

Expected: the lightbox tests and TypeScript pass.

- [ ] **Step 6: Commit the global renderer**

```bash
git add kilobot-docs/src/theme/MDXComponents/Img kilobot-docs/tests/help-center-brand.test.mjs
git commit -m "feat(docs): add image lightbox"
```

### Task 2: Integrated responsive verification

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the global `MDXImg` renderer from Task 1 and the four Quick Start screenshots.
- Produces: verified desktop/mobile behavior and a continuity receipt; no new runtime interface.

- [ ] **Step 1: Run the complete automated verification**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run test && bun test src/components/DocGuideComponents.test.tsx src/theme/MDXComponents/Img/index.test.tsx && bun run typecheck && bun run build && cd .. && git diff --check
```

Expected: all Node-native Docs tests, component tests, TypeScript, the Docusaurus production build, and whitespace checks pass.

- [ ] **Step 2: Serve the verified production build**

Run from `kilobot-docs`:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx serve build --listen 127.0.0.1:3001
```

Expected: the static docs build is available at `http://127.0.0.1:3001/start-here/quick-start`.

- [ ] **Step 3: Verify desktop behavior in the in-app browser**

At a desktop viewport:

1. Confirm each Quick Start screenshot has a small muted caption eight pixels below it.
2. Select the signup screenshot and confirm the lightbox fills the viewport.
3. Confirm the expanded image is centered and fully contained.
4. Select the expanded image and confirm the dialog stays open.
5. Select the backdrop and confirm the dialog closes.
6. Reopen it, use the X button, and confirm it closes.
7. Reopen it, press Escape, and confirm it closes.
8. Confirm focus returns to the original image control.

- [ ] **Step 4: Verify mobile behavior in the in-app browser**

At a 390px-wide viewport:

1. Confirm the screenshot and caption fit without horizontal overflow.
2. Confirm the mobile page-outline dropdown remains hidden.
3. Open the screenshot and confirm the image fits within the viewport.
4. Confirm the close button remains visible and reachable.
5. Close the dialog and confirm the document returns to the same reading position.

- [ ] **Step 5: Update the continuity ledger**

Record the completed image lightbox, caption behavior, exact test/build results, and browser verification in `CONTINUITY.md`. Keep the work unreleased and do not add a production changelog entry.

- [ ] **Step 6: Commit verification records**

```bash
git add CONTINUITY.md
git commit -m "docs: record image lightbox verification"
```

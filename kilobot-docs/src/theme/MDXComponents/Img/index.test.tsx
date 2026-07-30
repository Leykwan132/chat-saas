import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRef} from 'react';
import {describe, test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {fileURLToPath} from 'node:url';
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
    const backdrop = new EventTarget();
    const image = new EventTarget();

    assert.equal(isBackdropSelection(backdrop, backdrop), true);
    assert.equal(isBackdropSelection(image, backdrop), false);
  });

  test('centers light-grey captions directly below images', () => {
    const styles = readFileSync(
      fileURLToPath(new URL('./styles.module.css', import.meta.url)),
      'utf8',
    );
    const captionRule = styles.match(/\.caption \{[\s\S]*?\n\}/)?.[0] ?? '';

    assert.match(captionRule, /margin-top:\s*0\.625rem/);
    assert.match(captionRule, /font-size:\s*0\.875rem/);
    assert.match(captionRule, /font-weight:\s*500/);
    assert.match(captionRule, /color:\s*var\(--ifm-font-color-secondary\)/);
    assert.match(captionRule, /text-align:\s*center/);
  });
});

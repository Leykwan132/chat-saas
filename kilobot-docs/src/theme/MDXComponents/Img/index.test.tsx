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
    const backdrop = new EventTarget();
    const image = new EventTarget();

    assert.equal(isBackdropSelection(backdrop, backdrop), true);
    assert.equal(isBackdropSelection(image, backdrop), false);
  });
});

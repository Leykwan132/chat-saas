import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import DocExample from './DocExample';
import DocMediaPlaceholder from './DocMediaPlaceholder';
import DocOutcomes from './DocOutcomes';
import DocPrerequisites from './DocPrerequisites';
import DocSuccess from './DocSuccess';
import DocVerified from './DocVerified';

describe('guide components', () => {
  test('renders a complete media production brief', () => {
    const html = renderToStaticMarkup(
      <DocMediaPlaceholder
        kind="video"
        title="Connect the Website widget"
        description="Show the complete installation and verification journey."
        capture={['Copy the snippet', 'Publish the site', 'Verify Inbox']}
        callouts={['Copy action', 'Connected state']}
        duration="45–60 seconds"
        sensitive={['Customer phone numbers']}
        assetPath="/media/channels/website-installation.mp4"
      />,
    );

    assert.ok(html.includes('Media needed · Video'));
    assert.ok(html.includes('Connect the Website widget'));
    assert.ok(html.includes('45–60 seconds'));
    assert.ok(html.includes('Customer phone numbers'));
    assert.ok(html.includes('/media/channels/website-installation.mp4'));
    assert.ok(html.includes('aria-label="Video needed: Connect the Website widget"'));
  });

  test('renders prerequisites, examples, success, and verification metadata', () => {
    const html = renderToStaticMarkup(
      <>
        <DocVerified date="2026-07-28" />
        <DocPrerequisites>
          <ul><li>An agent</li></ul>
        </DocPrerequisites>
        <DocExample title="Northstar Dental">Example content</DocExample>
        <DocSuccess><p>The message appears in Inbox.</p></DocSuccess>
      </>,
    );

    assert.ok(html.includes('Last verified:'));
    assert.ok(html.includes('July 28, 2026'));
    assert.ok(html.includes('Before you begin'));
    assert.ok(html.includes('Northstar Dental'));
    assert.ok(html.includes('You’re done when'));
  });

  test('renders guide outcomes as one semantic section', () => {
    const html = renderToStaticMarkup(
      <DocOutcomes>
        <h3>By the end, you will</h3>
        <ul>
          <li>Create a working agent</li>
          <li>Add one trusted answer</li>
          <li>Test the approved answer</li>
        </ul>
      </DocOutcomes>,
    );

    assert.match(html, /^<section>/);
    assert.ok(html.includes('<h3>By the end, you will</h3>'));
    assert.ok(html.includes('<li>Create a working agent</li>'));
  });
});

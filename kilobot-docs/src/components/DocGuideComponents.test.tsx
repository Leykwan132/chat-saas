import assert from 'node:assert/strict';
import {MessageCircleQuestion} from 'lucide-react';
import { describe, test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import DocExample from './DocExample';
import DocMediaPlaceholder from './DocMediaPlaceholder';
import DocOutcomes from './DocOutcomes';
import DocPromptComparison from './DocPromptComparison';
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

  test('renders examples and verification metadata', () => {
    const html = renderToStaticMarkup(
      <>
        <DocVerified date="2026-07-28" />
        <DocExample title="Example Q&A" icon={MessageCircleQuestion}>
          Example content
        </DocExample>
      </>,
    );

    assert.ok(html.includes('Last verified:'));
    assert.ok(html.includes('July 28, 2026'));
    assert.ok(html.includes('Example Q&amp;A'));
    assert.ok(html.includes('data-icon="example"'));
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

  test('renders side-by-side prompt examples with copy actions', () => {
    const html = renderToStaticMarkup(
      <DocPromptComparison badPrompt="Be helpful." goodPrompt="Use approved facts." />,
    );

    assert.ok(html.includes('System prompt examples'));
    assert.ok(html.includes('Bad system prompt'));
    assert.ok(html.includes('Good system prompt'));
    assert.equal((html.match(/>Copy<\/button>/g) ?? []).length, 2);
    assert.ok(html.includes('Be helpful.'));
    assert.ok(html.includes('Use approved facts.'));
  });
});

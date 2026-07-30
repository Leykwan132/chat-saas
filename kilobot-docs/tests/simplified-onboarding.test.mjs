import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

test('keeps Quick Start to three required steps and compact next steps', () => {
  const quickStart = read('docs/start-here/quick-start.mdx');
  const requiredHeadings = [...quickStart.matchAll(/^## ([1-9])\. (.+)$/gm)];
  const nextStepItems = [
    '[Deploy to channels](/channels/connect-channels) to chat with customers on WhatsApp, Instagram, and Messenger.',
    '[Set up workflows](/automate/send-messages-and-assets) to send assets, involve your team, automate bookings, and follow up with customers.',
  ];
  const screenshotUrls = [
    'https://storage.kilobot.app/docs/docs-signup.png',
    'https://storage.kilobot.app/docs/docs-kb.png',
    'https://storage.kilobot.app/docs/docs-training.jpeg',
    'https://storage.kilobot.app/docs/docs-testing.png',
  ];
  const compactImageUrls = [
    'https://storage.kilobot.app/docs/docs-training.jpeg',
    'https://storage.kilobot.app/docs/docs-testing.png',
  ];
  const compactWrapper = '<div className="docs-image-compact">';
  const compactWrappers = [...quickStart.matchAll(
    /<div className="docs-image-compact">[\s\S]*?<\/div>/g,
  )].map((match) => match[0]);

  assert.deepEqual(
    requiredHeadings.map((match) => match[2].replace(/ ·.+$/, '')),
    ['Create your agent', 'Give your agent knowledge', 'Test your agent'],
  );
  assert.ok(quickStart.includes('## Next steps'));
  assert.ok(
    quickStart.includes('Choose what to set up next:'),
  );

  let previousNextStepIndex = quickStart.indexOf('## Next steps');
  for (const nextStepItem of nextStepItems) {
    const nextStepIndex = quickStart.indexOf(`- ${nextStepItem}`);
    assert.ok(nextStepIndex > previousNextStepIndex, nextStepItem);
    previousNextStepIndex = nextStepIndex;
  }
  assert.equal(quickStart.includes('import DocCard from'), false);
  assert.equal(quickStart.includes('<DocCard'), false);
  assert.equal(quickStart.includes('Connect the Website widget'), false);
  assert.equal(quickStart.includes('Confirm the conversation in Inbox'), false);
  assert.equal(quickStart.includes('[Deploy to channels]'), true);
  assert.equal(quickStart.includes('[Automate bookings]'), false);
  assert.equal(quickStart.includes('The reply should use the opening hours from the Q&A.'), false);
  assert.equal(quickStart.includes('Do you offer emergency root canals?'), false);
  assert.equal(
    quickStart.includes('The agent should not claim that Northstar Dental provides an unsupported service.'),
    false,
  );
  assert.equal(quickStart.includes('unsupported'), false);
  assert.equal(quickStart.includes('DocMediaPlaceholder'), false);
  assert.equal(quickStart.includes('/media/quick-start/'), false);
  assert.equal(quickStart.includes('Your agent is ready!'), true);

  for (const screenshotUrl of screenshotUrls) {
    assert.equal(quickStart.includes(screenshotUrl), true, screenshotUrl);
  }

  assert.equal(compactWrappers.length, 2);
  assert.ok(
    quickStart.includes('Training typically takes a few minutes, depending on source size and the queue.'),
  );
  for (const compactImageUrl of compactImageUrls) {
    assert.equal(
      compactWrappers.some((wrapper) => wrapper.includes(compactImageUrl)),
      true,
      compactImageUrl,
    );
  }
  assert.equal(quickStart.match(new RegExp(compactWrapper, 'g'))?.length, 2);
  assert.ok(
    quickStart.indexOf('https://storage.kilobot.app/docs/docs-testing.png')
      < quickStart.indexOf('Your agent is ready!'),
  );
  assert.ok(
    quickStart.indexOf('Your agent is ready!')
      < quickStart.indexOf('## Next steps'),
  );
});

test('uses task-based Workflow child labels', () => {
  const sidebar = read('sidebars.ts');
  const workflows = sidebar.match(
    /label: 'Workflows'[\s\S]*?label: 'Outreach'/,
  )?.[0];
  const labels = [
    'Send messages and assets',
    'Human in the loop',
    'Automate bookings',
    'Reminders',
    'Follow-ups',
  ];

  assert.ok(workflows);
  for (const label of labels) {
    assert.ok(workflows.includes(`label: '${label}'`), label);
  }
  assert.equal(workflows.includes("label: 'Overview'"), false);
  assert.equal(workflows.includes("label: 'Actions and testing'"), false);
});

test('keeps the desktop outline sticky without a duplicated local spacer', () => {
  const tocCss = read('src/css/toc.css');
  const desktopRule = tocCss.match(
    /\.theme-doc-toc-desktop \{[\s\S]*?\n\}/,
  )?.[0];
  const mobileRule = tocCss.match(
    /\.theme-doc-toc-mobile \{[\s\S]*?\n\}/,
  )?.[0];

  assert.ok(desktopRule);
  assert.ok(mobileRule);
  assert.ok(mobileRule.includes('display: none;'));
  assert.equal(desktopRule.includes('padding-left: 2rem;'), false);
  assert.equal(tocCss.includes('@media (max-width: 996px)'), false);
});

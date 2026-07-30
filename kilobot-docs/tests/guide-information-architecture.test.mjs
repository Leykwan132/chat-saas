import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function topLevelLabels(sidebar) {
  return [...sidebar.matchAll(/^      label: '([^']+)',/gm)].map((match) => match[1]);
}

test('uses the approved public guide order', () => {
  assert.deepEqual(topLevelLabels(read('sidebars.ts')), [
    'Getting started',
    'Agent',
    'Channels',
    'Bookings',
    'Workflows',
    'Broadcast',
    'Teams',
    'Releases',
    'Help and support',
  ]);
});

test('limits Getting started to Welcome and Quick Start', () => {
  const sidebar = read('sidebars.ts');
  const block = sidebar.match(
    /label: 'Getting started'[\s\S]*?items: \[([\s\S]*?)\],/,
  )?.[1];
  assert.ok(block);
  assert.deepEqual([...block.matchAll(/'([^']+)'/g)].map((match) => match[1]), [
    'start-here/welcome',
    'start-here/quick-start',
  ]);
});

test('starts Channels with the Website widget and hides Conversations', () => {
  const sidebar = read('sidebars.ts');
  const channels = sidebar.match(
    /label: 'Channels'[\s\S]*?label: 'Bookings'/,
  )?.[0];

  assert.ok(channels);
  assert.ok(channels.indexOf("'channels/website-widget'") > -1);
  assert.ok(
    channels.indexOf("'channels/website-widget'")
      < channels.indexOf("'channels/whatsapp'"),
  );
  assert.equal(channels.includes("'channels/connect-channels'"), false);
  assert.equal(channels.includes("label: 'Conversations'"), false);
  assert.equal(channels.includes("'engage/inbox'"), false);
  assert.equal(channels.includes("'engage/contacts'"), false);
});

test('hides Calendar from Bookings navigation', () => {
  const sidebar = read('sidebars.ts');
  const bookings = sidebar.match(
    /label: 'Bookings'[\s\S]*?label: 'Workflows'/,
  )?.[0];

  assert.ok(bookings);
  assert.ok(bookings.includes("'bookings/services'"));
  assert.ok(bookings.includes("'bookings/availability'"));
  assert.equal(bookings.includes("'bookings/calendar'"), false);
});

test('organizes Workflows around user tasks', () => {
  const sidebar = read('sidebars.ts');
  const workflows = sidebar.match(
    /label: 'Workflows'[\s\S]*?label: 'Broadcast'/,
  )?.[0];
  const orderedItems = [
    'automate/send-messages-and-assets',
    'automate/human-in-the-loop',
    'automate/automate-bookings',
    'automate/reminders',
    'automate/follow-ups',
  ];

  assert.ok(workflows);
  let previousIndex = -1;
  for (const item of orderedItems) {
    const itemIndex = workflows.indexOf(item);
    assert.ok(itemIndex > previousIndex, item);
    previousIndex = itemIndex;
  }
  assert.equal(workflows.includes('workflow-overview'), false);
  assert.equal(workflows.includes('build-and-test'), false);
});

test('places broadcasts before message templates', () => {
  const sidebar = read('sidebars.ts');
  const broadcast = sidebar.match(
    /label: 'Broadcast'[\s\S]*?label: 'Teams'/,
  )?.[0];

  assert.ok(broadcast);
  assert.ok(broadcast.indexOf('engage/broadcast') > -1);
  assert.ok(
    broadcast.indexOf('engage/broadcast')
      < broadcast.indexOf('engage/message-templates'),
  );
});

test('keeps hidden topics outside the public docs input', () => {
  for (const file of [
    'docs/engage/quick-replies.mdx',
    'docs/insights/overview-and-analytics.mdx',
    'docs/insights/usage-and-billing.mdx',
  ]) {
    assert.equal(existsSync(path.join(root, file)), false);
  }
});

test('removes Before you begin sections from every public guide', () => {
  const docsDirectory = path.join(root, 'docs');
  const guides = readdirSync(docsDirectory, { recursive: true })
    .filter((file) => file.endsWith('.mdx'));

  for (const guide of guides) {
    const source = read(path.join('docs', guide));

    assert.equal(source.includes('Before you begin'), false, guide);
    assert.equal(source.includes('DocPrerequisites'), false, guide);
  }
});

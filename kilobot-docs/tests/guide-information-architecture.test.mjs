import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
    'Outreach',
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

test('nests Conversations under Channels', () => {
  const sidebar = read('sidebars.ts');
  const channels = sidebar.match(
    /label: 'Channels'[\s\S]*?label: 'Bookings'/,
  )?.[0];
  assert.ok(channels);
  assert.ok(channels.includes("label: 'Conversations'"));
  assert.ok(channels.includes("'engage/inbox'"));
  assert.ok(channels.includes("'engage/contacts'"));
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

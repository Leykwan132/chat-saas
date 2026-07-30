import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

test('keeps Quick Start to three required steps and three optional next steps', () => {
  const quickStart = read('docs/start-here/quick-start.mdx');
  const requiredHeadings = [...quickStart.matchAll(/^## ([1-9])\. (.+)$/gm)];
  const nextStepCards = [...quickStart.matchAll(/<DocCard\b/g)];

  assert.deepEqual(
    requiredHeadings.map((match) => match[2].replace(/ ·.+$/, '')),
    ['Create your agent', 'Add knowledge', 'Test your agent'],
  );
  assert.equal(nextStepCards.length, 3);
  assert.ok(
    quickStart.includes(
      'title="Deploy to channels (WhatsApp, IG, Messenger)"',
    ),
  );
  assert.ok(quickStart.includes('to="/channels/connect-channels"'));
  assert.ok(quickStart.includes('title="Set up workflows"'));
  assert.ok(quickStart.includes('to="/automate/workflow-overview"'));
  assert.ok(quickStart.includes('title="Set up bookings"'));
  assert.ok(quickStart.includes('to="/bookings/services"'));
  assert.equal(quickStart.includes('Connect the Website widget'), false);
  assert.equal(quickStart.includes('Confirm the conversation in Inbox'), false);
});

test('uses concise Workflow child labels', () => {
  const sidebar = read('sidebars.ts');
  const workflows = sidebar.match(
    /label: 'Workflows'[\s\S]*?label: 'Outreach'/,
  )?.[0];

  assert.ok(workflows);
  assert.ok(workflows.includes("id: 'automate/workflow-overview'"));
  assert.ok(workflows.includes("label: 'Overview'"));
  assert.ok(workflows.includes("id: 'automate/build-and-test'"));
  assert.ok(workflows.includes("label: 'Build and test'"));
  assert.equal(workflows.includes('Workflow overview'), false);
  assert.equal(workflows.includes('Build and test a Workflow'), false);
});

test('adds desktop-only separation before the page outline', () => {
  const tocCss = read('src/css/toc.css');
  const desktopRule = tocCss.match(
    /\.theme-doc-toc-desktop \{[\s\S]*?\n\}/,
  )?.[0];

  assert.ok(desktopRule);
  assert.match(desktopRule, /padding-left: 2rem;/);
  assert.equal(tocCss.includes('@media (max-width: 996px)'), false);
});

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
  const nextSteps =
    'Your agent is ready! Continue by [deploying it to channels](/channels/connect-channels), [setting up workflows](/automate/workflow-overview), or [setting up bookings](/bookings/services).';

  assert.deepEqual(
    requiredHeadings.map((match) => match[2].replace(/ ·.+$/, '')),
    ['Create your agent', 'Give your agent knowledge', 'Test your agent'],
  );
  assert.ok(quickStart.includes('## Next steps'));
  assert.ok(quickStart.includes(nextSteps));
  assert.equal(quickStart.includes('import DocCard from'), false);
  assert.equal(quickStart.includes('<DocCard'), false);
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

test('keeps the desktop outline sticky without a duplicated local spacer', () => {
  const tocCss = read('src/css/toc.css');
  const desktopRule = tocCss.match(
    /\.theme-doc-toc-desktop \{[\s\S]*?\n\}/,
  )?.[0];

  assert.ok(desktopRule);
  assert.equal(desktopRule.includes('padding-left: 2rem;'), false);
  assert.equal(tocCss.includes('@media (max-width: 996px)'), false);
});

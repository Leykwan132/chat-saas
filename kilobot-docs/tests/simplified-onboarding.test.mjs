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

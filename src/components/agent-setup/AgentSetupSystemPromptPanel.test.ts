import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./AgentSetupSystemPromptPanel.tsx', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

test('system prompt panel explains when to use workflows for reliable actions', () => {
  expect(source).toContain('Use the system prompt for answering style, high-level goals, and general guardrails.');
  expect(source).toContain('For reliable conditional actions like sending an image or video, booking an appointment, or triggering a handoff, set them up in');
  expect(source).toContain('Workflow');
});

test('system prompt panel links the workflow note to the workflow route', () => {
  expect(source).toContain("import { Link } from 'react-router';");
  expect(source).toContain('workflowHref: string;');
  expect(source).toContain('to={workflowHref}');
  expect(source).toContain('text-primary');
  expect(source).toContain('hover:underline');
});

import { expect, test } from 'vitest';
import { getWorkflowSendMediaCopy } from './workflowSendMediaCopy';

test('send photo nodes use concise upload copy', () => {
  expect(getWorkflowSendMediaCopy('sendImage', 0, false)).toEqual({
    title: 'Your Photos/Videos',
    status: '0 uploaded',
  });

  expect(getWorkflowSendMediaCopy('sendImage', 1, false).status).toBe('1 uploaded');
  expect(getWorkflowSendMediaCopy('sendImage', 4, false).status).toBe('4 uploaded');
});

test('send file nodes keep file-specific title and concise upload copy', () => {
  expect(getWorkflowSendMediaCopy('sendFile', 0, false)).toEqual({
    title: 'Files to send',
    status: '0 uploaded',
  });

  expect(getWorkflowSendMediaCopy('sendFile', 2, false).status).toBe('2 uploaded');
});

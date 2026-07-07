import { expect, test } from 'vitest';
import { workflowAddOptions } from './workflowCatalog';

test('workflow add options start with business-controlled send message', () => {
  expect(workflowAddOptions.map((option) => option.kind)).toEqual([
    'sendText',
    'sendImage',
    'sendFile',
    'updateLeadsStatus',
    'bookAppointment',
    'humanEscalation',
    'closeConversation',
  ]);
  expect(workflowAddOptions[0]).toMatchObject({
    kind: 'sendText',
    label: 'Send message',
  });
  expect(workflowAddOptions[1]).toMatchObject({
    kind: 'sendImage',
    label: 'Send Photo/Video',
  });
  expect(workflowAddOptions[2]).toMatchObject({
    kind: 'sendFile',
    label: 'Send Files',
  });
});

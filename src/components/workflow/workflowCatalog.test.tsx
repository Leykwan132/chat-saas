import { expect, test } from 'vitest';
import { workflowAddOptions } from './workflowCatalog';

test('workflow add options include media actions after Q&A', () => {
  expect(workflowAddOptions.map((option) => option.kind)).toEqual([
    'answerQuestions',
    'sendImage',
    'sendFile',
    'updateLeadsStatus',
    'bookAppointment',
    'aiResponds',
    'closeConversation',
  ]);
  expect(workflowAddOptions[1]).toMatchObject({
    kind: 'sendImage',
    label: 'Send Photo/Video',
  });
  expect(workflowAddOptions[2]).toMatchObject({
    kind: 'sendFile',
    label: 'Send Files',
  });
});

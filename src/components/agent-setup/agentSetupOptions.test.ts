import { expect, test } from 'vitest';
import { AGENT_GOAL_OPTIONS } from '../../../shared/agentCreationGoals';
import { templateOptions } from './agentSetupOptions';

test('template options match the two agent creation goals', () => {
  expect(templateOptions.map(({ goal, key }) => ({ goal, key }))).toEqual([
    { goal: 'support', key: 'support' },
    { goal: 'bookService', key: 'sales' },
  ]);
  expect(templateOptions.map(({ goal }) => AGENT_GOAL_OPTIONS[goal])).toEqual([
    {
      label: 'Support',
      description: 'Answer questions, resolve issues, and escalate when human help is needed.',
    },
    {
      label: 'Book a Service',
      description: 'Answer service questions and help customers book an appointment.',
    },
  ]);
});

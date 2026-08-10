import { afterEach, expect, test, vi } from 'vitest';
import { createAgentSubmissionController } from './createAgentSubmission';

afterEach(() => {
  vi.useRealTimers();
});

test('submits once while active and allows one new submission after failure', async () => {
  vi.useFakeTimers();
  const submittedRequests: Array<{ name: string; businessName: string }> = [];
  const events: string[] = [];
  let attempt = 0;
  const controller = createAgentSubmissionController();
  const request = { name: 'Nova', businessName: 'Northstar' };
  const submission = {
    request,
    createAgent: async (input: typeof request) => {
      submittedRequests.push(input);
      attempt += 1;
      if (attempt === 1) throw new Error('Creation failed');
      return 'agent_123';
    },
    onStarted: () => events.push('started'),
    onProgressed: (phase: number) => events.push(`phase:${phase}`),
    onCreated: (agentId: string) => events.push(`created:${agentId}`),
    onReady: () => events.push('ready'),
    onFailed: (error: string) => events.push(`failed:${error}`),
  };

  expect(controller.start(submission)).toBe(true);
  expect(controller.start(submission)).toBe(false);
  await vi.advanceTimersByTimeAsync(2100);

  expect(submittedRequests).toEqual([request]);
  expect(events).toContain('failed:Creation failed');

  expect(controller.start(submission)).toBe(true);
  await vi.advanceTimersByTimeAsync(2800);

  expect(submittedRequests).toEqual([request, request]);
  expect(events).toContain('created:agent_123');
  expect(events.at(-1)).toBe('ready');
});

type AgentCreationSubmission<TRequest> = {
  request: TRequest;
  createAgent: (request: TRequest) => Promise<string>;
  onStarted: () => void;
  onProgressed: (phase: number) => void;
  onCreated: (agentId: string) => void;
  onReady: () => void;
  onFailed: (error: string) => void;
};

export function createAgentSubmissionController() {
  let active = false;
  const timers: Array<ReturnType<typeof setTimeout>> = [];

  const schedule = (callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    timers.push(timer);
  };

  const start = <TRequest>(submission: AgentCreationSubmission<TRequest>) => {
    if (active) return false;
    active = true;
    submission.onStarted();
    schedule(() => submission.onProgressed(1), 700);
    schedule(() => submission.onProgressed(2), 1400);
    schedule(() => {
      void submission.createAgent(submission.request).then(
        (agentId) => {
          submission.onCreated(agentId);
          schedule(submission.onReady, 700);
        },
        (error: unknown) => {
          active = false;
          submission.onFailed(
            error instanceof Error ? error.message : 'Unable to create agent',
          );
        },
      );
    }, 2100);
    return true;
  };

  const cancel = () => {
    timers.splice(0).forEach(clearTimeout);
    active = false;
  };

  return { start, cancel };
}

import { useEffect, useReducer, useState } from 'react';
import { useMutation } from 'convex/react';
import { usePostHog } from '@posthog/react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { AgentGoal } from '../../../shared/agentCreationGoals';
import { api } from '../../../convex/_generated/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreateAgentCreationState } from './CreateAgentCreationState';
import { CreateAgentGoalStep } from './CreateAgentGoalStep';
import { CreateAgentIdentityStep } from './CreateAgentIdentityStep';
import { CreateAgentSuccessState } from './CreateAgentSuccessState';
import { CreateAgentVisualPanel } from './CreateAgentVisualPanel';
import { createAgentSubmissionController } from './createAgentSubmission';
import {
  buildCreateAgentRequest,
  getCreateAgentDestinations,
  reduceCreateAgentStatus,
} from './createAgentWizardModel';

const INITIAL_STATUS = {
  step: 'identity' as const,
  phase: 0,
  error: null,
  createdAgentId: null,
};

const stepMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.22 },
};

export function CreateAgentWizard() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const createAgent = useMutation(api.agents.create);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [goal, setGoal] = useState<AgentGoal | null>(null);
  const [status, dispatch] = useReducer(reduceCreateAgentStatus, INITIAL_STATUS);
  const [submissionController] = useState(createAgentSubmissionController);

  useEffect(() => {
    return () => submissionController.cancel();
  }, [submissionController]);

  const handleCreate = () => {
    if (!goal) return;
    submissionController.start({
      request: buildCreateAgentRequest({
        name,
        businessName,
        businessDescription,
        goal,
      }),
      createAgent,
      onStarted: () => dispatch({ type: 'started' }),
      onProgressed: (phase) => dispatch({ type: 'progressed', phase }),
      onCreated: (agentId) => {
        dispatch({ type: 'created', agentId });
        posthog?.capture('agent_created', { goal });
        toast.success(`"${name.trim()}" created successfully`);
      },
      onReady: () => dispatch({ type: 'ready' }),
      onFailed: (error) => {
        posthog?.captureException(new Error(error));
        dispatch({ type: 'failed', error });
      },
    });
  };

  const stepLabel =
    status.step === 'identity'
      ? 'Step 1 of 2'
      : status.step === 'goal'
        ? 'Step 2 of 2'
        : status.step === 'creating'
          ? 'Creating agent…'
          : null;
  const destinations = status.createdAgentId
    ? getCreateAgentDestinations(status.createdAgentId)
    : null;

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className="fixed inset-x-0 top-0 border-b bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            to="/workspace"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            <ArrowLeft />
            Workspace
          </Link>
          {stepLabel ? (
            <span className="text-xs font-medium text-muted-foreground">{stepLabel}</span>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden pt-14">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-r">
          <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-12 sm:px-14 md:px-20">
            <div className="w-full max-w-xl">
              {status.error ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle />
                  <AlertDescription>{status.error}</AlertDescription>
                </Alert>
              ) : null}

              <AnimatePresence mode="wait">
                {status.step === 'identity' ? (
                  <motion.div key="identity" {...stepMotion}>
                    <CreateAgentIdentityStep
                      name={name}
                      businessName={businessName}
                      businessDescription={businessDescription}
                      onNameChange={setName}
                      onBusinessNameChange={setBusinessName}
                      onBusinessDescriptionChange={setBusinessDescription}
                      onBack={() => navigate('/workspace')}
                      onContinue={() => dispatch({ type: 'showGoal' })}
                    />
                  </motion.div>
                ) : null}

                {status.step === 'goal' ? (
                  <motion.div key="goal" {...stepMotion}>
                    <CreateAgentGoalStep
                      goal={goal}
                      onGoalChange={setGoal}
                      onBack={() => dispatch({ type: 'showIdentity' })}
                      onCreate={handleCreate}
                    />
                  </motion.div>
                ) : null}

                {status.step === 'creating' ? (
                  <CreateAgentCreationState
                    key="creating"
                    name={name}
                    phase={status.phase}
                    error={null}
                  />
                ) : null}

                {status.step === 'success' && destinations ? (
                  <CreateAgentSuccessState
                    key="success"
                    onTrain={() => navigate(destinations.train)}
                    onPlayground={() => navigate(destinations.playground)}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </main>

        <CreateAgentVisualPanel
          step={status.step}
          name={name}
          businessName={businessName}
          goal={goal}
          phase={status.phase}
        />
      </div>
    </div>
  );
}

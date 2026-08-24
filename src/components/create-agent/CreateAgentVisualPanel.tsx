import type { AgentGoal } from '../../../shared/agentCreationGoals';
import { AGENT_GOAL_OPTIONS } from '../../../shared/agentCreationGoals';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from '@/components/ui/terminal';
import { Spinner } from '@/components/ui/spinner';
import type { CreateAgentStep } from './createAgentWizardModel';

type CreateAgentVisualPanelProps = {
  step: CreateAgentStep;
  name: string;
  businessName: string;
  goal: AgentGoal | null;
  phase: number;
};

function IdentityTerminal({ name, businessName }: Pick<CreateAgentVisualPanelProps, 'name' | 'businessName'>) {
  const trimmedName = name.trim();
  const trimmedBusinessName = businessName.trim();

  return (
    <Terminal className="w-full">
      <TypingAnimation>&gt; kilobot agent create</TypingAnimation>
      <AnimatedSpan className="text-primary">✔ Workspace ready</AnimatedSpan>
      <AnimatedSpan className={trimmedName ? 'text-primary' : 'text-muted-foreground'}>
        {trimmedName ? `✔ Agent: ${trimmedName}` : '⏳ Waiting for agent name…'}
      </AnimatedSpan>
      <AnimatedSpan className={trimmedBusinessName ? 'text-primary' : 'text-muted-foreground'}>
        {trimmedBusinessName
          ? `✔ Represents: ${trimmedBusinessName}`
          : '⏳ Waiting for business name…'}
      </AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        Add a short business description for better starting context.
      </AnimatedSpan>
    </Terminal>
  );
}

function GoalTerminal({
  name,
  businessName,
  goal,
}: Pick<CreateAgentVisualPanelProps, 'name' | 'businessName' | 'goal'>) {
  return (
    <Terminal className="w-full">
      <TypingAnimation>&gt; kilobot configure goal</TypingAnimation>
      <AnimatedSpan className="text-primary">✔ Agent: {name.trim()}</AnimatedSpan>
      <AnimatedSpan className="text-primary">✔ Business: {businessName.trim()}</AnimatedSpan>
      <AnimatedSpan className={goal ? 'text-primary' : 'text-muted-foreground'}>
        {goal ? `✔ Goal: ${AGENT_GOAL_OPTIONS[goal].label}` : '⏳ Choose an agent goal…'}
      </AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        {goal
          ? AGENT_GOAL_OPTIONS[goal].description
          : 'Support customers or help them book a service.'}
      </AnimatedSpan>
    </Terminal>
  );
}

function BookingSetupTerminal({
  name,
  businessName,
  step,
}: Pick<CreateAgentVisualPanelProps, 'name' | 'businessName' | 'step'>) {
  const isAvailability = step === 'availability';
  return (
    <Terminal className="w-full">
      <TypingAnimation>&gt; kilobot configure booking</TypingAnimation>
      <AnimatedSpan className="text-primary">✔ Agent: {name.trim()}</AnimatedSpan>
      <AnimatedSpan className="text-primary">✔ Business: {businessName.trim()}</AnimatedSpan>
      <AnimatedSpan className={isAvailability ? 'text-primary' : 'text-muted-foreground'}>
        {isAvailability ? '✔ Set your availability' : '⏳ Set your availability…'}
      </AnimatedSpan>
      <AnimatedSpan className={isAvailability ? 'text-muted-foreground' : 'text-primary'}>
        {isAvailability ? '⏳ Create a service…' : '✔ Create a service'}
      </AnimatedSpan>
    </Terminal>
  );
}

function CreatingTerminal({
  name,
  businessName,
  goal,
  phase,
}: Omit<CreateAgentVisualPanelProps, 'step' | 'goal'> & { goal: AgentGoal }) {
  const goalLabel = AGENT_GOAL_OPTIONS[goal].label;
  const status = (done: boolean, ready: string, waiting: string) => (
    <AnimatedSpan className={done ? 'text-primary' : 'text-muted-foreground'}>
      {done ? `✔ ${ready}` : `⏳ ${waiting}…`}
    </AnimatedSpan>
  );

  return (
    <Terminal className="w-full">
      <TypingAnimation>&gt; kilobot agent prepare</TypingAnimation>
      {status(phase >= 1, `Creating ${name.trim()}`, `Creating ${name.trim()}`)}
      {status(phase >= 2, `Business: ${businessName.trim()}`, 'Adding business context')}
      {status(phase >= 3, `Goal: ${goalLabel}`, 'Applying agent goal')}
      {status(phase >= 3, 'Ready to go', 'Almost there')}
      {phase < 3 ? (
        <div className="flex items-center gap-2 px-4 pb-2 text-muted-foreground">
          <Spinner />
          <span>Please wait…</span>
        </div>
      ) : null}
    </Terminal>
  );
}

function ReadyTerminal({ name, goal }: { name: string; goal: AgentGoal }) {
  return (
    <Terminal className="w-full">
      <TypingAnimation>&gt; kilobot agent ready</TypingAnimation>
      <AnimatedSpan className="text-primary">✔ {name.trim()} is ready</AnimatedSpan>
      <AnimatedSpan className="text-primary">
        ✔ Goal: {AGENT_GOAL_OPTIONS[goal].label}
      </AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        Train, test, or deploy your agent to a channel.
      </AnimatedSpan>
    </Terminal>
  );
}

export function CreateAgentVisualPanel(props: CreateAgentVisualPanelProps) {
  if ((props.step === 'creating' || props.step === 'success') && !props.goal) {
    throw new Error('Creating and ready states require an agent goal');
  }

  return (
    <aside className="relative hidden w-[40%] shrink-0 overflow-hidden bg-background lg:flex lg:items-center lg:justify-center lg:p-10">
      <AnimatedGridPattern
        width={40}
        height={40}
        maxOpacity={0.3}
        className="opacity-60 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />
      <div className="relative w-full max-w-lg">
        {props.step === 'identity' ? <IdentityTerminal {...props} /> : null}
        {props.step === 'goal' ? <GoalTerminal {...props} /> : null}
        {props.step === 'availability' || props.step === 'service' ? (
          <BookingSetupTerminal {...props} />
        ) : null}
        {props.step === 'creating' && props.goal ? (
          <CreatingTerminal {...props} goal={props.goal} />
        ) : null}
        {props.step === 'success' && props.goal ? (
          <ReadyTerminal name={props.name} goal={props.goal} />
        ) : null}
      </div>
    </aside>
  );
}

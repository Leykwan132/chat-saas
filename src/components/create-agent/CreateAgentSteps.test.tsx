import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { CreateAgentGoalStep } from './CreateAgentGoalStep';
import { CreateAgentIdentityStep } from './CreateAgentIdentityStep';
import { CreateAgentCreationState } from './CreateAgentCreationState';
import { CreateAgentAvailabilityStep } from './CreateAgentAvailabilityStep';
import { CreateAgentSuccessState } from './CreateAgentSuccessState';
import { CreateAgentServiceStep } from './CreateAgentServiceStep';
import { CreateAgentVisualPanel } from './CreateAgentVisualPanel';

test('identity step renders required business details', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentIdentityStep
      name=""
      businessName=""
      businessDescription=""
      onNameChange={() => undefined}
      onBusinessNameChange={() => undefined}
      onBusinessDescriptionChange={() => undefined}
      onBack={() => undefined}
      onContinue={() => undefined}
    />,
  );

  expect(markup).toContain('About your agent');
  expect(markup).toContain('text-3xl font-semibold tracking-tight sm:text-4xl');
  expect(markup).not.toContain('We&#x27;ll use this context to prepare the agent&#x27;s instructions.');
  expect(markup).toContain('Agent name');
  expect(markup).toContain('Business name');
  expect(markup.match(/aria-hidden="true" class="text-destructive">\*<\/span>/g)).toHaveLength(3);
  expect(markup).toContain('Business description');
  expect(markup).not.toContain('Optional');
  expect(markup).toContain('id="agent-name" required="" aria-required="true"');
  expect(markup).toContain('id="business-name" required="" aria-required="true"');
  expect(markup).toContain('id="business-description" required="" aria-required="true"');
  expect(markup).not.toContain('A short description helps the agent give more relevant answers.');
  expect(markup).toContain('disabled=""');
  expect(markup).toContain('data-variant="ghost"');
});

test('goal step renders only Support and Book a Service choices', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentGoalStep
      goal={null}
      onGoalChange={() => undefined}
      onBack={() => undefined}
      onCreate={() => undefined}
    />,
  );

  expect(markup).toContain('Support');
  expect(markup).toContain('Book a Service');
  expect(markup).toContain('aria-labelledby="support-goal-label"');
  expect(markup).toContain('aria-describedby="support-goal-description"');
  expect(markup).toContain('id="support-goal-description"');
  expect(markup).toContain('Set your goal');
  expect(markup).not.toContain('>Goal<');
  expect(markup).toContain('text-3xl font-semibold tracking-tight sm:text-4xl');
  expect(markup).not.toContain('This prepares the starting instructions for your agent.');
  expect(markup).toContain('data-spacing="5"');
  expect(markup).toContain('items-stretch');
  expect(markup).toContain('rounded-xl');
  expect(markup).toContain('min-h-48');
  expect(markup).toContain('h-full');
  expect(markup).toContain('!p-8');
  expect(markup).toContain('gap-3');
  expect(markup).toContain('data-[state=on]:!border-2');
  expect(markup).toContain('data-[state=on]:!border-foreground');
  expect(markup).toContain('data-variant="ghost"');
  expect(markup).not.toContain('General');
  expect(markup).not.toContain('Model');
});

test('booking goal continues to availability instead of creating immediately', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentGoalStep
      goal="bookService"
      onGoalChange={() => undefined}
      onBack={() => undefined}
      onCreate={() => undefined}
    />,
  );

  expect(markup).toContain('Continue');
  expect(markup).not.toContain('Create agent');
});

test('availability setup reassures users that they can edit it later', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentAvailabilityStep
      shiftDrafts={[]}
      timezone="Asia/Kuala_Lumpur"
      onShiftDraftsChange={() => undefined}
      onTimezoneChange={() => undefined}
      onBack={() => undefined}
      onContinue={() => undefined}
    />,
  );

  expect(markup).toContain('You can edit it later.');
});

test('service setup enables AI appointment scheduling', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentServiceStep
      name="Consultation"
      durationMinutes={30}
      appointmentBookingEnabled
      onNameChange={() => undefined}
      onDurationChange={() => undefined}
      onAppointmentBookingEnabledChange={() => undefined}
      onBack={() => undefined}
      onCreate={() => undefined}
      onSkip={() => undefined}
    />,
  );

  expect(markup).toContain('Enable AI appointment scheduling');
  expect(markup).not.toContain('Let AI schedule appointments');
});

test('service setup reassures users that services can be managed later', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentServiceStep
      name="Consultation"
      durationMinutes={30}
      appointmentBookingEnabled
      onNameChange={() => undefined}
      onDurationChange={() => undefined}
      onAppointmentBookingEnabledChange={() => undefined}
      onBack={() => undefined}
      onCreate={() => undefined}
      onSkip={() => undefined}
    />,
  );

  expect(markup).toContain('You can add or edit your services later.');
});

test('success state offers training and playground without channel deployment', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentSuccessState
      onTrain={() => undefined}
      onPlayground={() => undefined}
    />,
  );

  expect(markup).toContain('Train your agent');
  expect(markup).toContain('gap-2');
  expect(markup.match(/px-4/g)).toHaveLength(2);
  expect(markup).toContain('Try in Playground');
  expect(markup).not.toContain('Create a workflow');
  expect(markup).not.toContain('Deploy to a channel');
});

test('creation state reports business context and goal preparation', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentCreationState name="Nova" phase={2} error={null} />,
  );

  expect(markup).toContain('Adding business context');
  expect(markup).toContain('Applying agent goal');
  expect(markup).toContain('size-6');
  expect(markup).toContain('size-3.5');
  expect(markup).not.toContain('Applying role &amp; model');
});

test('visual panel shows the represented business and selected goal without a model', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentVisualPanel
      step="goal"
      name="Nova"
      businessName="Northstar Dental"
      goal="support"
      phase={0}
    />,
  );

  expect(markup).toContain('Northstar Dental');
  expect(markup).toContain('Support');
  expect(markup).not.toContain('Model');
});

test('visual panel fails visibly when an active creation state has no goal', () => {
  expect(() =>
    renderToStaticMarkup(
      <CreateAgentVisualPanel
        step="creating"
        name="Nova"
        businessName="Northstar Dental"
        goal={null}
        phase={0}
      />,
    ),
  ).toThrow('Creating and ready states require an agent goal');
});

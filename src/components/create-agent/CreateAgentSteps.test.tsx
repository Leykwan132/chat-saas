import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { CreateAgentGoalStep } from './CreateAgentGoalStep';
import { CreateAgentIdentityStep } from './CreateAgentIdentityStep';
import { CreateAgentCreationState } from './CreateAgentCreationState';
import { CreateAgentSuccessState } from './CreateAgentSuccessState';
import { CreateAgentVisualPanel } from './CreateAgentVisualPanel';

test('identity step renders required business fields and an optional description', () => {
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

  expect(markup).toContain('Agent name');
  expect(markup).toContain('Business name');
  expect(markup).toContain('Business description');
  expect(markup).toContain('Optional');
  expect(markup).toContain('id="agent-name" required="" aria-required="true"');
  expect(markup).toContain('id="business-name" required="" aria-required="true"');
  expect(markup).toContain('disabled=""');
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
  expect(markup).not.toContain('General');
  expect(markup).not.toContain('Model');
});

test('success state offers training, playground, and channel deployment', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentSuccessState
      onTrain={() => undefined}
      onPlayground={() => undefined}
      onDeploy={() => undefined}
    />,
  );

  expect(markup).toContain('Train your agent');
  expect(markup).toContain('Try in Playground');
  expect(markup).toContain('Deploy to a channel');
});

test('creation state reports business context and goal preparation', () => {
  const markup = renderToStaticMarkup(
    <CreateAgentCreationState name="Nova" phase={2} error={null} />,
  );

  expect(markup).toContain('Adding business context');
  expect(markup).toContain('Applying agent goal');
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

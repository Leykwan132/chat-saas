import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { CreateAgentGoalStep } from './CreateAgentGoalStep';
import { CreateAgentIdentityStep } from './CreateAgentIdentityStep';

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
  expect(markup).not.toContain('General');
  expect(markup).not.toContain('Model');
});

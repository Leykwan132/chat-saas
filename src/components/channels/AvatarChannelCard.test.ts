import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { AvatarChannelCard } from './AvatarChannelCard';

test('avatar channel card opens avatar setup', () => {
  const markup = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(AvatarChannelCard, { agentId: 'agent-1' }),
    ),
  );

  expect(markup).toContain('href="/dashboard/agent-1/avatar"');
  expect(markup).toContain('Avatar');
  expect(markup).toContain('Beta');
});

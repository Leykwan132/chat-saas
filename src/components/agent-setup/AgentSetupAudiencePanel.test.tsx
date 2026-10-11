import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { AgentSetupRoutingPanel } from './AgentSetupRoutingPanel';
import type { ComponentProps } from 'react';

test('audience setting appears after reply timing in configuration', () => {
  const props = {
    name: 'Agent', model: 'test', models: [], systemPrompt: 'Test', responseLength: 'brief',
    emojiUse: 'never', formality: 'casual', humorLevel: 'none', canReadRouting: true,
    canManageRouting: true, isRoutingSettingsLoading: false, isPublishing: false,
    replyMode: 'automatic', replyAudience: 'ads', agentId: 'agent', isTestOpen: false,
    showModelPicker: false,
  } as unknown as ComponentProps<typeof AgentSetupRoutingPanel>;
  const html = renderToStaticMarkup(createElement(AgentSetupRoutingPanel, props));
  expect(html).toContain('Who should AI reply to?');
  expect(html.indexOf('Who should AI reply to?')).toBeGreaterThan(html.indexOf('When should AI reply'));
});

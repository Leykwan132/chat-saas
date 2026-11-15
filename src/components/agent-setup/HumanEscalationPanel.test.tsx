import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { getFunctionName } from 'convex/server';
import { HumanEscalationRules } from './HumanEscalationRules';
import { HumanEscalationPanel } from './HumanEscalationPanel';
import { WorkflowNodeEscalationMessageControl } from '../workflow/WorkflowNodeEscalationMessageControl';
import { AutoDeescalationControl } from './AutoDeescalationControl';

let graph: unknown = null;
vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => getFunctionName(reference) === 'workflows:getForAgent' ? graph : null,
}));

const agentId = 'agent' as never;

test('shows only the master switch when Human Escalation is off', () => {
  graph = null;
  const markup = renderToStaticMarkup(<HumanEscalationPanel agentId={agentId} />);
  expect(markup).toContain('Human Escalation');
  expect(markup).not.toContain('Add escalation rule');
  expect(markup).not.toContain('Auto Resolve');
  expect(markup).not.toContain('data-slot="card"');
  expect(markup).toContain('aria-checked="false"');
  expect(markup).not.toContain('Resume AI after (minutes)');
});

test('preserves existing conditions without offering multiple-rule controls', () => {
  graph = {
    workflow: {},
    nodes: [
      { _id: 'first', kind: 'humanEscalation' },
      { _id: 'second', kind: 'humanEscalation' },
      { _id: 'start', kind: 'start' },
    ],
    edges: [
      { _id: 'one', targetNodeId: 'first', label: 'Condition', detail: 'Customer asks for a person' },
      { _id: 'two', targetNodeId: 'first', label: 'Condition', detail: 'Urgent support' },
      { _id: 'three', targetNodeId: 'second', label: 'Condition', detail: 'Cannot answer' },
    ],
  };
  const markup = renderToStaticMarkup(<HumanEscalationRules agentId={agentId} graph={graph as never} disabled={false} />);
  expect(markup).not.toContain('Escalation rule');
  expect(markup).not.toContain('Add escalation rule');
  expect(markup).toContain('Condition');
  expect(markup).toContain('Customer asks for a person');
  expect(markup).toContain('Urgent support');
  expect(markup).toContain('Cannot answer');
});

test('enabled controls describe timer and keywords above their inputs', () => {
  const markup = renderToStaticMarkup(<AutoDeescalationControl agentId={agentId} config={{ enabled: true, inactivityMinutes: 30, keywords: ['AI can take over'], revision: 1, activationRevision: 1 }} />);
  expect(markup).toContain('Resume AI after (minutes)');
  expect(markup).toContain('value="30"');
  expect(markup).toContain('Auto Resolve Keyword Triggers');
  expect(markup).toContain('Remove keyword AI can take over');
  expect(markup).toContain('Add keyword');
  expect(markup).not.toContain('<textarea');
  expect(markup).toContain('The timer restarts each time your team replies.');
  expect(markup).toContain('Resume AI when your team replies with any of these keywords.');
  expect(markup).not.toContain('Each human reply restarts the timer');
  expect(markup).not.toContain('Replies are visible to the customer');
  expect(markup).not.toContain('AI resumes on the next customer message.');
  expect(markup).not.toContain('Unsaved changes');
  expect(markup).toContain('Save');
});


test('disabled Human Escalation hides saved rules and auto de-escalation settings', () => {
  graph = { workflow: { humanEscalationEnabled: false }, nodes: [{ _id: 'saved-rule', kind: 'humanEscalation' }], edges: [{ _id: 'saved-condition', targetNodeId: 'saved-rule', detail: 'Customer asks for a person' }] };
  const markup = renderToStaticMarkup(<HumanEscalationPanel agentId={agentId} />);
  expect(markup).toContain('aria-checked="false"');
  expect(markup).toContain('aria-hidden="true"');
  expect(markup).toContain('hidden=""');
});


test('enabled Human Escalation shows its details immediately without an expansion button', () => {
  graph = { workflow: { humanEscalationEnabled: true }, nodes: [{ _id: 'saved-rule', kind: 'humanEscalation' }], edges: [] };
  const markup = renderToStaticMarkup(<HumanEscalationPanel agentId={agentId} />);
  expect(markup).toContain('aria-checked="true"');
  expect(markup).not.toContain('data-slot="collapsible"');
  expect(markup).toContain('aria-hidden="false"');
  expect(markup).not.toContain('Add escalation rule');
  expect(markup).toContain('Escalation Keyword Triggers');
  expect(markup).toContain('Auto Resolve');
  expect(markup).not.toContain('data-slot="card"');
});


test('custom escalation message switch uses AI when off and keeps exact text when on', () => {
  const base = { agentId, nodeId: 'rule' as never, enabled: true, disabled: false, message: 'Saved manual message' };
  const ai = renderToStaticMarkup(<WorkflowNodeEscalationMessageControl {...base} mode="ai" />);
  expect(ai).toContain('Custom escalation message');
  expect(ai).not.toContain('Escalation message mode');
  expect(ai).toContain('customer’s language');
  expect(ai).not.toContain('<textarea');
  const manual = renderToStaticMarkup(<WorkflowNodeEscalationMessageControl {...base} mode="manual" />);
  expect(manual).toContain('<textarea');
  expect(manual).toContain('Saved manual message');
});

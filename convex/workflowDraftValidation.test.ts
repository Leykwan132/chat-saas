import { expect, test } from 'vitest';
import { validateWorkflowDraft } from './workflowDraftValidation';

const nodes = [
  { clientId: 'start', kind: 'start' as const, title: 'Start', positionX: 0, positionY: 0 },
  { clientId: 'message', kind: 'sendText' as const, title: 'Message', positionX: 200, positionY: 0 },
];

test('validates a complete workflow draft', () => {
  expect(() => validateWorkflowDraft(nodes, [{
    sourceClientId: 'start',
    targetClientId: 'message',
    detail: 'When the customer asks for help',
  }])).not.toThrow();
});

test('rejects an edge without condition detail', () => {
  expect(() => validateWorkflowDraft(nodes, [{
    sourceClientId: 'start',
    targetClientId: 'message',
    detail: '   ',
  }])).toThrow('Condition detail is required');
});

test('rejects missing starts and invalid terminal connections', () => {
  expect(() => validateWorkflowDraft(nodes.slice(1), [])).toThrow('exactly one entry node');
  expect(() => validateWorkflowDraft(
    [...nodes, { clientId: 'human', kind: 'humanEscalation' as const, title: 'Human', positionX: 400, positionY: 0 }],
    [{ sourceClientId: 'human', targetClientId: 'message' }],
  )).toThrow('terminal node');
});

test('rejects duplicate client identifiers and edges to start', () => {
  expect(() => validateWorkflowDraft([...nodes, nodes[1]], [])).toThrow('unique');
  expect(() => validateWorkflowDraft(nodes, [{ sourceClientId: 'message', targetClientId: 'start' }])).toThrow('entry node');
});

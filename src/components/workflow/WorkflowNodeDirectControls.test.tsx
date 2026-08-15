import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { WorkflowNodeDirectControls } from './WorkflowNodeDirectControls';

vi.mock('convex/react', () => ({
  useAction: () => async () => undefined,
  useMutation: () => async () => undefined,
  useQuery: () => [],
}));

const agentId = 'agent' as Id<'agents'>;
const nodeId = 'node' as Id<'workflowNodes'>;
const edgeId = 'edge' as Id<'workflowEdges'>;

function renderControls(
  kind: Parameters<typeof WorkflowNodeDirectControls>[0]['kind'],
  conditionDetail?: string,
) {
  return renderToStaticMarkup(
    <WorkflowNodeDirectControls
      agentId={agentId}
      nodeId={nodeId}
      kind={kind}
      description="Share the booking link."
      incomingCondition={conditionDetail === undefined ? undefined : {
        edgeId,
        detail: conditionDetail,
      }}
      disabled={false}
    />,
  );
}

test('renders the primary direct controls for editable workflow actions', () => {
  expect(renderControls('sendText')).toContain('aria-label="Message to send"');
  expect(renderControls('sendImage')).toContain('Your Photos/Videos');
  expect(renderControls('sendFile')).toContain('Files to send');
  expect(renderControls('humanEscalation', 'When the customer asks for a person.'))
    .toContain('When the customer asks for a person.');
  expect(renderControls('closeConversation')).toContain('Closes the conversation.');
});

test('does not add a direct control to structural workflow nodes', () => {
  expect(renderControls('start')).toBe('');
  expect(renderControls('end')).toBe('');
});

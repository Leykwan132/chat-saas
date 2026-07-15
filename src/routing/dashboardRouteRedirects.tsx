import { Navigate, useParams } from 'react-router';

export function OldAgentRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/agent-setup`} replace />;
}

export function PlaygroundRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/agent-setup`} replace />;
}

export function FollowUpRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/workflow`} replace />;
}

export function KnowledgeBaseIndex() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/knowledge-base/web`} replace />;
}

export function ChatsToInboxRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
}

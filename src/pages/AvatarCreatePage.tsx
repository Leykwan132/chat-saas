import { useParams } from 'react-router';
import type { Id } from '../../convex/_generated/dataModel';
import { AvatarSetupEditor } from '@/components/avatar/AvatarSetupEditor';

export default function AvatarCreatePage() {
  const { agentId } = useParams();
  return <AvatarSetupEditor agentId={agentId as Id<'agents'>} showBackLink />;
}

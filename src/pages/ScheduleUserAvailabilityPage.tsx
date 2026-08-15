import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ScheduleAvailabilityEditor } from '@/components/schedule/ScheduleAvailabilityEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';

export default function ScheduleUserAvailabilityPage() {
  const { agentId, workosUserId: workosUserIdParam } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const decodedWorkosUserId = workosUserIdParam
    ? decodeURIComponent(workosUserIdParam)
    : undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadSchedule = can(Permission.AVAILABILITY_READ);
  const canManage = can(Permission.ROUTING_MANAGE);
  const currentUser = useQuery(api.users.currentUser);

  if (!typedAgentId || !decodedWorkosUserId) return null;

  if (!permissionsLoading && !canReadSchedule) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  if (permissionsLoading || currentUser === undefined) {
    return <ScheduleUserAvailabilitySkeleton />;
  }

  if (currentUser === null) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isOwnSchedule = decodedWorkosUserId === currentUser.workosUserId;
  const canEditAvailability = canManage || isOwnSchedule;
  const detailPath = `/dashboard/${typedAgentId}/availability/${encodeURIComponent(decodedWorkosUserId)}`;

  if (!canEditAvailability) {
    return <Navigate to={detailPath} replace />;
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Link
        to={detailPath}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
          Available hours
        </h1>
        <ScheduleAvailabilityEditor
          agentId={typedAgentId}
          workosUserId={decodedWorkosUserId}
          onSaved={() => navigate(detailPath)}
        />
      </div>
    </div>
  );
}

function ScheduleUserAvailabilitySkeleton() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Skeleton className="h-4 w-16" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

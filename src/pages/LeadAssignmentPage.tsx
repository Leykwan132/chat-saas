import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { RefreshCw, Scale, UserRoundCheck } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import LeadAssignmentAnimation from '@/components/LeadAssignmentAnimation';

type AssignmentMethod = 'round_robin' | 'balanced' | 'manual';

const ASSIGNMENT_METHOD_OPTIONS: Array<{
  value: AssignmentMethod;
  label: string;
  description: string;
  icon: typeof RefreshCw;
}> = [
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Assign to the teammate with the fewest open leads.',
    icon: Scale,
  },
  {
    value: 'round_robin',
    label: 'Round robin',
    description: 'Rotate leads evenly across eligible teammates.',
    icon: RefreshCw,
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Keep leads unassigned so admins can manually distribute them.',
    icon: UserRoundCheck,
  },
];

function normalizeAssignmentMethod(method: string): AssignmentMethod {
  if (method === 'balanced' || method === 'priority') return 'balanced';
  if (method === 'manual') return 'manual';
  return 'round_robin';
}

export default function LeadAssignmentPage() {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canRead = can(Permission.ROUTING_READ);
  const canManage = can(Permission.ROUTING_MANAGE);

  const settings = useQuery(
    api.leadRouting.settings.getForAgent,
    typedAgentId && canRead ? { agentId: typedAgentId } : 'skip',
  );

  const updateSettings = useMutation(api.leadRouting.settings.updateForAgent);

  const [method, setMethod] = useState<AssignmentMethod>('balanced');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setMethod(normalizeAssignmentMethod(settings.method));
  }, [settings]);

  const hasChanges = settings
    ? method !== normalizeAssignmentMethod(settings.method)
    : false;

  const handleSave = async () => {
    if (!typedAgentId || !canManage) return;
    setSaving(true);
    try {
      await updateSettings({
        agentId: typedAgentId,
        method,
      });
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (!typedAgentId) {
    return null;
  }

  if (!permissionsLoading && !canRead) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading = permissionsLoading || settings === undefined;

  if (isLoading) {
    return <LeadAssignmentPageSkeleton />;
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
          Lead Assignment
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-8 lg:gap-16 items-start mt-2">
        {/* Left Column: Assignment Options (stacked vertically) */}
        <div className="space-y-4 pt-1">
          <RadioGroup
            value={method}
            onValueChange={(value) => canManage && setMethod(value as AssignmentMethod)}
            disabled={!canManage}
            className="flex flex-col gap-3 max-w-2xl"
          >
            {ASSIGNMENT_METHOD_OPTIONS.map((option) => {
              return (
                <div
                  key={option.value}
                  onClick={() => canManage && setMethod(option.value)}
                  className={cn(
                    'flex items-start gap-3 py-3 transition-colors cursor-pointer',
                    !canManage && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`assignment-method-${option.value}`}
                    className="mt-1"
                    disabled={!canManage}
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`assignment-method-${option.value}`}
                      className={cn(
                        'block cursor-pointer',
                        !canManage && 'cursor-not-allowed',
                      )}
                    >
                      <span className="block text-base font-semibold leading-tight text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                        {option.description}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {canManage && hasChanges ? (
            <div className="flex justify-start pt-4 border-t border-border/60 mt-4">
              <Button
                type="button"
                className="px-5"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ) : null}
        </div>

        {/* Right Column: Visual Animation */}
        <div className="hidden lg:block w-full">
          <LeadAssignmentAnimation method={method} />
        </div>
      </div>
    </div>
  );
}

function LeadAssignmentPageSkeleton() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Skeleton className="h-9 w-52" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-8">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <Skeleton className="hidden lg:block h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

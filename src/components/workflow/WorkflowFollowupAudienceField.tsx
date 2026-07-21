import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { useParams } from 'react-router';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Label } from '@/components/ui/label';
import { MultiSelect, type MultiSelectGroup } from '@/components/ui/multi-select';
import { getLeadTemperatureStyle, LEAD_TEMPERATURE_TAGS } from '@/lib/leadTemperature';
import { cn } from '@/lib/utils';
import { useWorkflowAutomationState } from './workflowAutomationContext';

function getTagDotClass(tag: string) {
  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) {
    hash = tag.charCodeAt(index) + ((hash << 5) - hash);
  }
  const dotColors = [
    'bg-blue-500 dark:bg-blue-400',
    'bg-emerald-500 dark:bg-emerald-400',
    'bg-violet-500 dark:bg-violet-400',
    'bg-amber-500 dark:bg-amber-400',
    'bg-rose-500 dark:bg-rose-400',
    'bg-cyan-500 dark:bg-cyan-400',
  ];
  return dotColors[Math.abs(hash) % dotColors.length];
}

function useWorkflowAudienceGroups(): MultiSelectGroup[] {
  const { agentId } = useParams();
  const { dataMode } = useWorkflowAutomationState();
  const candidates = useQuery(
    api.customers.listForAgentBroadcast,
    dataMode === 'authenticated' && agentId
      ? { agentId: agentId as Id<'agents'> }
      : 'skip',
  );

  return useMemo(() => {
    const tags = new Set<string>();
    candidates?.forEach((customer) => {
      customer.tags.forEach((tag) => tags.add(tag));
    });

    const leadOptions = LEAD_TEMPERATURE_TAGS.map((temperature) => {
      const style = getLeadTemperatureStyle(temperature);
      const Icon = style.icon;
      const recommended = temperature === 'Hot' || temperature === 'Warm';
      return {
        value: `lead:${temperature}`,
        selectedLabel: (
          <span className="flex items-center gap-1.5">
            <Icon className={cn('size-3 shrink-0', style.iconClass)} />
            <span>{temperature}</span>
          </span>
        ),
        label: (
          <span className="flex items-center gap-2">
            <Icon className={cn('size-3.5 shrink-0', style.iconClass)} />
            <span>{temperature}</span>
            {recommended && (
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                Recommended
              </span>
            )}
          </span>
        ),
        searchValue: recommended ? `${temperature} recommended` : temperature,
      };
    });

    const tagOptions = Array.from(tags).sort().map((tag) => ({
      value: `tag:${tag}`,
      label: (
        <span className="flex items-center gap-2">
          <span className={cn('size-1.5 shrink-0 rounded-full', getTagDotClass(tag))} />
          <span>{tag}</span>
        </span>
      ),
      searchValue: tag,
    }));

    return [
      { label: 'Lead temperature', options: leadOptions },
      ...(tagOptions.length > 0 ? [{ label: 'Tags', options: tagOptions }] : []),
    ];
  }, [candidates]);
}

export function WorkflowFollowupAudienceField({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { followupAudienceFilters, setFollowupAudienceFilters } =
    useWorkflowAutomationState();
  const groups = useWorkflowAudienceGroups();

  return (
    <div
      className="nodrag nopan flex flex-col gap-2.5"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <Label className={cn(
        'font-semibold text-foreground',
        compact ? 'text-[11px]' : 'text-xs',
      )}
      >
        Select audiences
      </Label>
      <MultiSelect
        value={followupAudienceFilters}
        onValueChange={setFollowupAudienceFilters}
        groups={groups}
        placeholder="Select lead temperatures and tags..."
        searchPlaceholder="Search lead temperatures or tags..."
        triggerClassName={compact ? 'h-10 px-3 py-1.5 text-[11px]' : 'min-h-12'}
        emptyLabel="No matching audiences found."
      />
    </div>
  );
}

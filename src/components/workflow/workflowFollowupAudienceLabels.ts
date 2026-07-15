import { isLeadTemperatureTag } from '@/lib/leadTemperature';

export const DEFAULT_WORKFLOW_FOLLOWUP_AUDIENCE_FILTERS = [
  'lead:Hot',
  'lead:Warm',
] as const;

export function isWorkflowFollowupHotAndWarmAudience(filters: string[]) {
  return filters.length === 2
    && filters.includes('lead:Hot')
    && filters.includes('lead:Warm');
}

export function getWorkflowFollowupAudienceFilterLabel(filter: string) {
  if (filter.startsWith('lead:')) {
    const temperature = filter.slice(5);
    if (!isLeadTemperatureTag(temperature)) {
      throw new Error(`Unknown lead temperature filter: ${filter}`);
    }
    return temperature;
  }

  if (filter.startsWith('tag:')) {
    const tag = filter.slice(4).trim();
    if (!tag) {
      throw new Error('Audience tag filter is empty');
    }
    return tag;
  }

  throw new Error(`Unknown audience filter: ${filter}`);
}

export function getWorkflowFollowupAudienceLabel(filters: string[]) {
  if (filters.length === 0) {
    return 'No audiences selected';
  }

  const labels = filters.map(getWorkflowFollowupAudienceFilterLabel);
  if (labels.length <= 3) {
    return labels.join(', ');
  }

  return `${labels.slice(0, 2).join(', ')} + ${labels.length - 2}`;
}

export function getWorkflowFollowupAudienceDetail(filters: string[]) {
  const leadCount = filters.filter((filter) => filter.startsWith('lead:')).length;
  const tagCount = filters.filter((filter) => filter.startsWith('tag:')).length;

  if (filters.length === 0) {
    return 'Choose lead temperatures or tags';
  }

  if (leadCount > 0 && tagCount > 0) {
    return `${leadCount} lead temperature${leadCount === 1 ? '' : 's'}, ${tagCount} tag${tagCount === 1 ? '' : 's'}`;
  }

  if (leadCount > 0) {
    return `${leadCount} lead temperature${leadCount === 1 ? '' : 's'}`;
  }

  return `${tagCount} customer tag${tagCount === 1 ? '' : 's'}`;
}

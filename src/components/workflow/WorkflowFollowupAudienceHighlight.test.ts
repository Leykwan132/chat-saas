import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('highlights hot and warm with aligned audience-selector icons', () => {
  const audienceLabels = source('./workflowFollowupAudienceLabels.ts');
  const summary = source('./workflowFollowupSummary.ts');
  const summaryNode = source('./WorkflowFollowupSummaryNode.tsx');

  expect(audienceLabels).toContain('export function isWorkflowFollowupHotAndWarmAudience');
  expect(summary).toContain('isHotAndWarmAudience: isWorkflowFollowupHotAndWarmAudience(');
  expect(summaryNode).toContain('summary.isHotAndWarmAudience ?');
  expect(summaryNode).toContain("getLeadTemperatureStyle(temperature)");
  expect(summaryNode).toContain('const Icon = style.icon;');
  expect(summaryNode).toContain('className="inline-flex items-center gap-1.5"');
  expect(summaryNode).toContain("className={cn('size-3 shrink-0', style.iconClass)}");
  expect(summaryNode).toContain('<LeadTemperatureSummaryHighlight temperature="Hot" />');
  expect(summaryNode).toContain('<LeadTemperatureSummaryHighlight temperature="Warm" />');
  expect(summaryNode).not.toContain('🔥');
  expect(summaryNode).not.toContain('☀️');
});

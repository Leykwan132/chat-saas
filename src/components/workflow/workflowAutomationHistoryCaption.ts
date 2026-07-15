export function formatWorkflowAutomationHistoryCaption({
  automationKind,
  sentCount,
}: {
  automationKind: 'reminder' | 'followUp';
  sentCount: number;
}) {
  const isPlural = sentCount !== 1;
  const label = automationKind === 'reminder'
    ? isPlural ? 'reminders' : 'reminder'
    : isPlural ? 'follow-ups' : 'follow-up';
  return `${sentCount} ${label} sent so far.`;
}

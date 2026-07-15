import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('legacy follow-up frontend retirement', () => {
  test('redirects every legacy route to Workflow without legacy page imports', () => {
    const source = readSource('./main.tsx');
    const redirects = readSource('./routing/dashboardRouteRedirects.tsx');

    expect(source).not.toContain("import AutomationsFollowUpPage");
    expect(source).not.toContain("import FollowUpPage");
    expect(source).not.toContain("import FollowUpDetailPage");
    expect(source).toContain('FollowUpRedirect,');
    expect(redirects).toContain('function FollowUpRedirect()');
    expect(redirects).toContain('to={`/dashboard/${agentId}/workflow`}');
    expect(source.match(/path="follow-ups(?:\/new|\/:ruleId)?" element={<FollowUpRedirect \/>}/g)).toHaveLength(3);
  });

  test.each([
    './components/inbox/ConversationWindowBanner.tsx',
    './components/workflow/WorkflowFollowupCostCalculatorDialog.tsx',
    './components/workflow/WorkflowFollowupGuides.tsx',
  ])('%s links follow-up actions to Workflow', (relativePath) => {
    const source = readSource(relativePath);

    expect(source).toContain('/workflow');
    expect(source).not.toContain('/follow-ups');
  });
});

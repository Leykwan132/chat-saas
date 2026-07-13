import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const reminderSource = readFileSync(
  new URL('./WorkflowReminderSetupNode.tsx', import.meta.url),
  'utf8',
);
const followUpSource = readFileSync(
  new URL('./WorkflowFollowupSetupNode.tsx', import.meta.url),
  'utf8',
);

describe('workflow automation scope cards', () => {
  test('shows the precise reminder scope choices', () => {
    expect(reminderSource).toContain('Current & future');
    expect(reminderSource).toContain(
      'Schedule remaining reminders for confirmed upcoming appointments and all new appointments.',
    );
    expect(reminderSource).toContain(
      'Schedule reminders for new appointments while reminders are on.',
    );
  });

  test('shows the precise follow-up scope choices', () => {
    expect(followUpSource).toContain('Current & future');
    expect(followUpSource).toContain(
      'Schedule follow-ups still due for eligible existing conversations and after new messages.',
    );
    expect(followUpSource).toContain(
      'Schedule follow-ups after new eligible messages while follow-up is on.',
    );
  });

  test('uses the shared single-select scope control on both cards', () => {
    expect(reminderSource).toContain('<WorkflowAutomationScopeField');
    expect(followUpSource).toContain('<WorkflowAutomationScopeField');
  });
});

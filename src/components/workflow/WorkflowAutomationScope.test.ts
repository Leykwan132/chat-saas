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
const scopeFieldSource = readFileSync(
  new URL('./WorkflowAutomationScopeField.tsx', import.meta.url),
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

  test('renders a vertical basic radio group', () => {
    expect(scopeFieldSource).toContain("from '@/components/ui/radio-group'");
    expect(scopeFieldSource).toContain('<RadioGroup');
    expect(scopeFieldSource).toContain('<RadioGroupItem');
    expect(scopeFieldSource.match(/<Field orientation="horizontal"/g)).toHaveLength(2);
    expect(scopeFieldSource).toContain('<FieldContent>');
    expect(scopeFieldSource).not.toContain('ToggleGroup');
  });

  test('shows both descriptions with their labelled radio choices', () => {
    const radioFields = Array.from(
      scopeFieldSource.matchAll(/<Field orientation="horizontal"[\s\S]*?<\/Field>/g),
      (match) => match[0],
    );
    expect(radioFields).toHaveLength(2);
    expect(radioFields[0]).toContain('currentAndFutureDescription');
    expect(radioFields[1]).toContain('futureOnlyDescription');
    expect(scopeFieldSource).toContain('htmlFor={currentAndFutureId}');
    expect(scopeFieldSource).toContain('htmlFor={futureOnlyId}');
    expect(scopeFieldSource).toContain('onChange(nextValue);');
  });
});

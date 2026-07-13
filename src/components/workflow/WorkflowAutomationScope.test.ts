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

  test('renders compact equal-width left and right buttons', () => {
    expect(scopeFieldSource).toContain('type="single"');
    expect(scopeFieldSource).toContain('spacing={0}');
    expect(scopeFieldSource).toContain('grid-cols-2');
    expect(scopeFieldSource).toContain('text-xs font-medium');
    expect(scopeFieldSource).toContain('rounded-l-md');
    expect(scopeFieldSource).toContain('rounded-r-md');
    expect(scopeFieldSource).not.toContain('font-semibold');
    expect(scopeFieldSource).not.toContain('orientation="vertical"');
  });

  test('shows only the selected scope description below the buttons', () => {
    const toggleItems = Array.from(
      scopeFieldSource.matchAll(/<ToggleGroupItem[\s\S]*?<\/ToggleGroupItem>/g),
      (match) => match[0],
    );
    expect(toggleItems).toHaveLength(2);
    expect(toggleItems.join('\n')).not.toContain('Description');
    expect(scopeFieldSource).toContain('const selectedDescription =');
    expect(scopeFieldSource).toContain('{selectedDescription && (');
    expect(scopeFieldSource).toContain('onChange(nextValue);');
  });
});

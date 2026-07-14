import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(
  fileURLToPath(new URL('./WorkflowReminderTimingRow.tsx', import.meta.url)),
  'utf8',
);

test('shows the saved custom timing in the trigger without adding it to the menu', () => {
  expect(source).toContain(
    "!option.id.startsWith('customReminderTiming:')",
  );
  expect(source).toContain('triggerLabel={selectedOption?.label}');
});

test('uses compact, even spacing inside the reminder timing menu', () => {
  expect(source).toContain('listClassName="p-1.5"');
  expect(source).toContain('optionClassName="rounded-md px-3 py-2"');
});

test('commits custom timing through one atomic context action', () => {
  expect(source).toContain('setReminderCustomTimingOption(option);');
  expect(source).not.toContain('addReminderCustomTimingOption(option);');
  expect(source).not.toContain('onUpdateOptionId(option.id);');
});

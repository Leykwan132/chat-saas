import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('places the booked-appointments notice below the reminder summary description', () => {
  const setupSource = source('./WorkflowReminderSetupNode.tsx');
  const summarySource = source('./WorkflowReminderSummaryNode.tsx');
  const descriptionEnd = summarySource.indexOf('</p>');
  const noticeCopyIndex = summarySource.indexOf(
    'Reminders will only be sent to customers with booked appointments.',
  );
  const separatorIndex = summarySource.indexOf('<Separator />');

  expect(setupSource).not.toContain(
    'Reminders will only be sent to customers with booked appointments.',
  );
  expect(summarySource).toContain("import { ArrowRight, Info } from 'lucide-react'");
  expect(summarySource).toContain(
    '<Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />',
  );
  expect(summarySource).toContain(
    'rounded-md border border-dashed border-border/80 bg-background px-3 py-3',
  );
  expect(summarySource).not.toContain('bg-muted/50');
  expect(noticeCopyIndex).toBeGreaterThan(descriptionEnd);
  expect(separatorIndex).toBeGreaterThan(noticeCopyIndex);
});

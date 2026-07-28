import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./PlanUsageCard.tsx', import.meta.url),
  'utf8',
);

test('shows a concise local credit reset date instead of redundant plan status', () => {
  expect(source).toContain('planAndUsage?.periodEndMs');
  expect(source).toContain('`Resets ${new Date(periodEndMs).toLocaleDateString');
  expect(source).not.toContain('Credits reset on');
  expect(source).not.toContain("hour: 'numeric'");
  expect(source).not.toContain("minute: '2-digit'");
  expect(source).not.toContain('You are on ${planName} plan');
});

test('keeps exact balances with a slightly smaller hierarchy', () => {
  expect(source).toContain('text-xl font-semibold tracking-tight');
  expect(source).toContain('text-xs text-muted-foreground');
  expect(source).toContain('{remaining.toLocaleString()}');
  expect(source).toContain('{total.toLocaleString()} credits');
  expect(source).not.toContain('text-2xl font-semibold tracking-tight');
});

test('separates the remaining value and total with an explicit gap', () => {
  expect(source).toContain(
    'className="inline-flex shrink-0 items-baseline gap-1.5 truncate tabular-nums"',
  );
  expect(source).toContain(
    '<span className="text-xs text-muted-foreground">of {total.toLocaleString()} credits</span>',
  );
});

test('opens plan settings from the manage plan action', () => {
  expect(source).toContain('<Settings className="size-3.5" />');
  expect(source).toContain('Manage plan');
  expect(source).toContain('navigate(`${base}?section=plan`)');
  expect(source).not.toContain('More credits');
  expect(source).not.toContain('#plan-add-ons');
});

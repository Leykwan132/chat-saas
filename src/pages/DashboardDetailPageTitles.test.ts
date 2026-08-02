import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

function pageSource(fileName: string) {
  return readFileSync(fileURLToPath(new URL(fileName, import.meta.url)), 'utf8');
}

function titleClassBeforeMarker(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  expect(markerIndex).toBeGreaterThan(-1);
  const prefix = source.slice(Math.max(0, markerIndex - 500), markerIndex);
  const classMatches = [...prefix.matchAll(/className="([^"]+)"/g)];
  return classMatches.at(-1)?.[1] ?? '';
}

function expectBrandTitle(source: string, marker: string) {
  const className = titleClassBeforeMarker(source, marker);
  expect(className).toContain('font-title');
  expect(className).toContain('font-normal');
  expect(className).not.toContain('font-semibold');
  expect(className).not.toContain('font-bold');
}

test('uses KiloBot typography for authenticated detail page titles', () => {
  const customerSource = pageSource('./CustomerDetailPage.tsx');
  const followUpSource = pageSource('./FollowUpDetailPage.tsx');
  const broadcastSource = pageSource('./BroadcastDetailPage.tsx');
  const templateSource = pageSource('./TemplateDetailPage.tsx');
  const serviceSource = pageSource('./ServicePage.tsx');
  const availabilitySource = pageSource('./ScheduleUserAvailabilityPage.tsx');
  const scheduleDetailSource = pageSource('./ScheduleUserDetailPage.tsx');

  expectBrandTitle(customerSource, "customer.name?.trim() || 'Unnamed Customer'");
  const followUpHeaderStart = followUpSource.indexOf('Back to Follow-ups');
  const followUpHeaderEnd = followUpSource.indexOf('<DetailSectionNav', followUpHeaderStart);
  const followUpHeaderSource = followUpSource.slice(followUpHeaderStart, followUpHeaderEnd);
  expectBrandTitle(followUpHeaderSource, '                  {name}\n                </h1>');
  expect(followUpHeaderSource).toContain('max-w-2xl font-title text-3xl font-normal');
  expectBrandTitle(broadcastSource, '{schedule.templateName}');
  expectBrandTitle(templateSource, '{template.name}');
  expectBrandTitle(serviceSource, "form.name.trim() || 'Edit service'");
  expectBrandTitle(availabilitySource, '          Available hours\n        </h1>');
  expectBrandTitle(scheduleDetailSource, '{displayName}');
});

test('keeps described detail headers 24px from their content', () => {
  expect(pageSource('./CustomerDetailPage.tsx')).toContain(
    'flex w-full max-w-3xl flex-col gap-6',
  );
  expect(pageSource('./ScheduleUserDetailPage.tsx')).toContain(
    'flex w-full max-w-3xl flex-col gap-6',
  );
  expect(pageSource('./BroadcastDetailPage.tsx')).toContain(
    'flex w-full flex-col gap-6',
  );
});

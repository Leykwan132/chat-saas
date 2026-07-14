import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./CreateCustomerBookingDialog.tsx', import.meta.url),
  'utf8',
);
const buttonVariantsSource = readFileSync(
  new URL('../ui/buttonVariants.ts', import.meta.url),
  'utf8',
);
const comboboxSource = readFileSync(new URL('../ui/combobox.tsx', import.meta.url), 'utf8');
const themeSource = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

test('uses shared schedule controls and automatic exact-slot availability', () => {
  expect(source).toContain('ManualBookingScheduleField');
  expect(source).toContain("const [startTime, setStartTime] = useState('')");
  expect(source).toContain("const [endTime, setEndTime] = useState('')");
  expect(source).toContain('const endTimeCustomizedRef = useRef(false)');
  expect(source).toContain('defaultManualBookingEndTime');
  expect(source).toContain('endAt: nextSelection.endAt');
  expect(source).toContain('endAt: selection.endAt');
  expect(source).toContain('checkAvailability');
  expect(source).toContain('sm:max-w-xl');
  expect(source).toContain('<div className="grid gap-5">');
  expect(source).toContain('<div className="grid gap-3">');
  expect(source).toContain('className="h-10 w-full px-3 text-sm"');
  expect(source).toContain('<SelectContent className="text-sm">');
  expect(source).toContain('className="py-2.5 text-sm"');
  expect(source).toContain("import { Link, useParams } from 'react-router'");
  expect(source).toContain("import { Plus } from 'lucide-react'");
  expect(source).toContain("throw new Error('Missing agent ID')");
  expect(source).toContain('to={`/dashboard/${agentId}/services/new`}');
  expect(source).toContain('Create new service');
  expect(source).toContain('const comboboxPortalContainerRef = useRef<HTMLDivElement>(null)');
  expect(source).toContain('portalContainer={comboboxPortalContainerRef}');
  expect(source).toContain('variant="linkAccent"');
  expect(source).not.toContain('className="h-auto p-0 text-primary"');
  expect(buttonVariantsSource).toContain('linkAccent: "text-link underline-offset-4 hover:text-link/80 hover:underline"');
  expect(themeSource).toContain('--color-link: var(--link);');
  expect(themeSource.match(/--link:/g)).toHaveLength(2);
  expect(source).toContain('overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-none"');
  expect(source).toContain('<div ref={comboboxPortalContainerRef} className="pointer-events-none absolute inset-0" />');
  expect(source).not.toContain('<DialogContent ref={comboboxPortalContainerRef}');
  expect(source).toContain('<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>');
  expect(comboboxSource).toContain('className="pointer-events-auto isolate z-50"');
  expect(source).not.toContain('variant="outline" size="sm" className="h-8 gap-1.5"');
  expect(source).not.toContain('CalendarDatePickerField');
  expect(source).not.toContain('TimeSelectInput');
  expect(source).not.toContain("import { Check, X } from 'lucide-react'");
  expect(source).not.toContain('Find available times');
  expect(source).not.toContain('listAvailableSlots');
  expect(source).not.toContain('setSlots');
  expect(source).not.toContain('type="date"');
  expect(source).not.toContain('type="time"');
});

import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./CreateCustomerBookingDialog.tsx', import.meta.url),
  'utf8',
);

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
  expect(source).not.toContain('CalendarDatePickerField');
  expect(source).not.toContain('TimeSelectInput');
  expect(source).not.toContain("import { Check, X } from 'lucide-react'");
  expect(source).not.toContain('Find available times');
  expect(source).not.toContain('listAvailableSlots');
  expect(source).not.toContain('setSlots');
  expect(source).not.toContain('type="date"');
  expect(source).not.toContain('type="time"');
});

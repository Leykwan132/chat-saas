# Manual Booking Control Spacing Design

## Goal

Make the Create booking form easier to scan and operate by increasing spacing around the Service and Schedule controls, improving Service text readability, and widening the time dropdown without changing booking behavior.

## Approved Design

- Increase the dialog width from `sm:max-w-lg` to `sm:max-w-xl` so the date and both time fields have enough horizontal space.
- Increase the form section gap from 16px to 20px.
- Increase the Service label-to-control gap from 8px to 12px.
- Keep the Service trigger at 40px tall and full width, but override the shared compact Select typography with `text-sm` and comfortable horizontal padding.
- Render Service dropdown options with `text-sm` and 10px vertical padding.
- Keep Clock, Date, Start, separator, and End in one row.
- Increase the Schedule label-to-row gap and the gaps between row controls to 12px.
- Give both time controls a 128px minimum width so their placeholder and selected time remain readable.
- Make the time popup at least 176px wide, keep each time on one line, and use 12px horizontal by 10px vertical item padding.
- Preserve the shared Combobox composition, free-form time entry, scrolling, availability checks, and service-duration defaults.

## Responsive Behavior

The wider modal is applied at the existing `sm` breakpoint. The row continues using flexible grid columns so the Date field receives more space than each time field while Start and End remain equal in width.

## Scope

Change only the manual Create booking dialog, its Schedule field, the reusable editable time Combobox, and focused source-regression tests. Do not modify shared global Select defaults or booking data flow.

## Verification

- Regression tests assert the wider dialog, larger Service typography and spacing, wider schedule gaps, minimum time widths, and wider non-wrapping time menu.
- Existing manual-booking schedule and availability tests remain green.
- Targeted ESLint, production build, `git diff --check`, and touched-code line-count checks pass under Node v22.

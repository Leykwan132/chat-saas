# Manual Booking Compact Time, Date, and Service Action Design

## Goal

Make manual booking controls more compact and actionable by using short time labels, increasing time-option precision, shortening the visible date, and adding direct access to Service creation.

## Time Formatting and Options

- `formatCalendarTimeOption` returns lowercase, unspaced meridiem labels such as `11:20pm`.
- `CALENDAR_TIME_OPTIONS` contains all 96 quarter-hour values from `12:00am` through `11:45pm`.
- The shared formatter and option list update manual booking, Calendar time selectors, and Service preferred-time selectors consistently.
- `parseCalendarTimeLabel` remains permissive and accepts existing forms such as `11:20 PM`, `11:20pm`, and 24-hour input.
- Parsed and selected values normalize to the compact label.
- Manual booking continues injecting a valid custom minute value, such as `11:20pm`, when it is not one of the quarter-hour options.

## Manual Booking Date

- `CalendarDatePickerField` gains an optional `displayFormat` string property.
- Its default remains `MMM d, yyyy`, preserving every existing consumer.
- `ManualBookingScheduleField` passes `EEEE, d MMMM`, producing labels such as `Thursday, 11 June`.
- Stored values remain `yyyy-MM-dd`; date selection and availability logic are unchanged.

## Create New Service Action

- The Service label area becomes a horizontal row with `Service` on the left and a small outline `+ Create new service` button on the right.
- The button uses the current `agentId` route parameter and navigates to `/dashboard/:agentId/services/new`.
- A missing `agentId` fails explicitly because this dialog is only valid inside the agent dashboard route.
- Navigation replaces the booking dialog view with the existing Create Service flow; no duplicate service form is introduced.

## Scope

Change only the shared calendar-time utility and its tests, the shared date picker property and focused tests, and the manual booking Service/Schedule presentation and tests. Do not change persisted schemas, availability checks, duration defaults, or booking mutations.

## Verification

- Red-green tests cover compact formatting, 96 quarter-hour options, permissive parsing, custom minute normalization, default and manual date formats, and the Service creation route.
- Existing manual-booking model and affected shared-time consumer tests remain green.
- Targeted ESLint, production build, `git diff --check`, and touched-code line-count checks pass under Node v22.

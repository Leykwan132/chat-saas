# Personal Availability Skeleton Design

## Goal

Keep Availability loading states visually consistent with the page that finishes loading.

## Personal Workspace Skeleton

- When the active workspace is personal, display the Availability page title and its leads-and-bookings description while availability data loads.
- Replace teammate identity, status, and action placeholders with skeletons matching the inline available-hours editor and Time off section.
- Preserve the final personal page's focused layout: no role, status, name, email, or dashboard-back placeholders.

## Organization Skeleton

- Retain the existing teammate-detail loading skeleton for organizational availability views, including its identity and management-status placeholders.
- The loading branch must use known active-workspace context only; it must not alter authorization, data fetching, or redirects.

## Testing

- Extend the rendered Availability detail route test to cover the personal loading branch and assert it contains the page heading and description while omitting teammate-profile placeholders.
- Preserve organizational loading coverage and run focused Availability tests, TypeScript, and whitespace diff checks under Node v22.

# Service Location Card Layout Design

## Goal

Make the service Location setting clearer and easier to scan without changing its stored values or booking behavior.

## Interface

The service details section labels the control `Location`. It presents two equal option cards:

- Remote uses a video-camera icon, the title `Remote`, and the existing Google Meet connection description.
- In person uses a map-pin icon, the title `In person`, and the existing appointment-address description.

Each card keeps its radio indicator and selection behavior. The icon is placed beside a text column so the title appears above the description rather than alongside it. The responsive two-column layout remains unchanged.

When In person is selected, the address input label becomes `Address (optional)`. Its value, placeholder, visibility, and persistence stay unchanged.

## Non-goals

- Changing Remote or In person values, defaults, or booking behavior.
- Changing the Google Meet connection requirement or address storage.
- Altering the Location control's responsive card layout or selection affordance.

## Verification

The service-details markup test asserts the Location label, both icon identifiers, vertically grouped option text, and Address (optional) label. Run the service form tests, TypeScript check, and diff check under Node v22.

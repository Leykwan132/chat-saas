# Google Calendar Connection Badge Design

## Goal

Give a connected Google Calendar account one clear, polished confirmation mark.

## Rendering

The status mark beside the connected email uses the supplied badge-check geometry. Its badge shape is solid green with a matching green outline, and only the inner tick is white. It has no extra wrapper circle or duplicate check mark.

## Accessibility and boundaries

The icon retains the existing `Active` accessible label. Connection state, account controls, click behaviour, tooltip copy, and all other Google Calendar indicators remain unchanged.

## Verification

Update the connection-card regression test to assert the badge path treatment and that the connected control still renders one SVG status icon.

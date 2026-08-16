# Calendar internal-details layout

## Goal

Make the internal area of a calendar event easier to scan by separating the event summary from staff information and notes.

## Layout

On medium and larger screens, Internal details uses two columns. The left column contains the team member, attendee list, and internal notes. The right column contains Summary when the event has one. On smaller screens, the columns stack with Summary after the left-column content. If an event has no summary, the left content uses the full available width.

## Content surfaces

Internal notes and Summary retain their labels above their text. Their text areas use a padded, rounded neutral surface. The note and summary icons align with the top of their respective label-and-content groups. Empty notes keep the existing empty-state wording inside the same neutral surface.

## Edit-time prefill

The shared time selector normalizes a provided time to its canonical calendar option before rendering it. It preserves an existing valid time that is not on the standard 15-minute interval by including that normalized value in the available options. This applies consistently to every calendar edit surface that uses the shared selector.

## Scope and verification

The layout change is presentation-only: event data, actions, and visibility rules do not change. The time-prefill correction changes only how existing timestamps are represented in edit controls. Add focused regression coverage for the responsive structure, neutral content surfaces, icon alignment, and canonical edit-time selection.

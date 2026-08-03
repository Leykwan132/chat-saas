# Workflow Readiness Validation Refinement Design

## Goal

Make each workflow prerequisite explicit in the inspector, explain missed requirements at the relevant section when Apply is attempted, and preserve Human escalation as immediately ready.

## Readiness policy

Human escalation is configuration-free. It is ready when created and stays ready during all readiness refreshes, even when its incoming edge has no condition detail. Other non-entry nodes continue to require a configured incoming condition before their own prerequisites are evaluated.

## Inspector validation

`Your Photos/Videos` uses the same visible required marker as `Files to send`. An Apply attempt on incomplete configuration keeps the inspector open and displays a concise destructive message beside each incomplete required section. The messages clear when their corresponding condition is satisfied. The required sections are condition detail, action message or goal, appointment services, appointment availability, files, and photos/videos.

## Appointment presentation

The Book appointment inspector shows the existing sidebar `ShoppingCart` icon beside Services and `Clock3` beside Availability. In each availability roster row, the teammate information remains top-aligned while the `Accepting leads` label and switch are centered vertically as one control group.

## Verification

Focused tests cover the Human escalation readiness exception, the required Photos/Videos label, Apply-attempt warnings, sidebar icon choices, and split roster alignment. Node v22 runs the relevant Vitest files and the production build.

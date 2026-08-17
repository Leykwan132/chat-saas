# Overview Topic Panel Interaction Design

## Goal

Keep every Common Topics row comfortably visible and visually connect a hovered row to its donut segment.

## Layout

The Common Topics and Customer Sentiment panels retain a 340px minimum height, but no fixed height. Their natural content determines additional height, so seven topic rows, their separators, the title block, and bottom padding are never clipped. The paired panels retain the same height in the two-column layout.

## Interaction

Hovering a Common Topics row sets its index as active. The matching donut segment expands by 10px using Recharts' `Sector` shape. Leaving the row clears the active state. The donut tooltip remains available for direct chart interaction.

## Validation

A focused component test covers the flexible panel sizing and passes a hovered topic index from the list to the donut's active-sector renderer. The existing overview component suite and production build provide regression coverage.

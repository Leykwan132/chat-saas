# Overview preview upgrade action

## Goal

Make the upgrade path clear while a Free or Starter user previews sample Common Topics and Customer Sentiment data.

## Layout

When the user selects Preview, render both sample analytics panels as today. Render one primary `Upgrade now` button below the two-panel grid, aligned to the left edge of the preview area. Do not render an additional preview-level Upgrade button above the panels.

## Behavior

The button invokes the existing upgrade callback. The locked state continues to show its existing Preview and Upgrade actions. Entitled Growth and Business users do not see preview-specific actions.

## Testing

Add a regression that verifies the preview action label and its lower, left-aligned placement. Keep the locked-state action regression.

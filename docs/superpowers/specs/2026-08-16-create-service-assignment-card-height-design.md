# Create Service assignment-card height

## Goal

Remove unused vertical space below the assignment-card content in the Create Service dialog.

## Behavior

For myself and For team cards use their icon, title, description, and existing padding to determine their height. The two cards remain equal-height within their desktop grid row, and their selection, upgrade overlay, and radio controls remain unchanged.

## Scope and verification

Remove the forced minimum height from the shared assignment-card Field. Update the existing rendered-card regression to confirm the minimum-height utility is absent while the card content and selection controls remain present.

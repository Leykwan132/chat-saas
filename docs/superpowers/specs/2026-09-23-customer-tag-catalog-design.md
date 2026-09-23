# Customer Tag Catalog Design

## Goal

Remove Customer Detail's subscription to 100 enriched customer records while retaining the existing workspace tag picker.

## Current behavior

Customer Detail loads the selected customer, then calls `customers.listForCurrentOrg` with `numItems: 100`. The page extracts `tags` from those customer records only to populate the Add tag picker. The list query also resolves each customer's latest conversation and, when present, assigned agent.

## Chosen design

Add a `customerTags` table that stores one distinct non-temperature customer tag per workspace. Each record contains a stable `workspaceKey` and the display tag. Team workspaces use their organization ID; personal workspaces use their authenticated user ID because personal customer rows use an empty organization ID. It has an index for workspace-plus-tag lookup.

The Customer Detail picker reads the catalog instead of customer rows. Its existing create, select, and remove interactions remain unchanged. Removing a tag from a customer does not remove the catalog entry: a tag stays available for reuse once introduced to a workspace.

## Write path

All customer-facing paths that add or replace customer tags write catalog entries in the same mutation: manual customer creation, customer import, customer update with tags, and `addCustomerTag`. Tag values retain current trim, case, and reserved-temperature handling. Conversation-only tags are out of scope because the Customer Detail picker represents customer tags.

Catalog insertion is idempotent by `(workspaceKey, tag)`: mutations first look up the indexed record and insert only when absent. Concurrent writes rely on Convex transaction retries to preserve one logical catalog entry.

## Existing data rollout

The new table is additive and can deploy safely. New customer-tag writes start populating it in the first deployment. A `@convex-dev/migrations` migration then processes customers in bounded batches and inserts catalog records for their existing non-temperature tags, checking the workspace-plus-tag index before inserting. Historical personal customers without an owner ID are reported rather than assigned to another workspace. The runner supports dry run, resume, and production status checks.

The Customer Detail page can switch to the catalog query in the same deployment because the migration begins immediately after deployment; the catalog may briefly have only newly written tags until the backfill completes. To avoid an incomplete picker during that interval, the page remains on the existing customer scan until the backfill is confirmed, then a second deployment switches the read path. No customer tags are modified or deleted.

## Verification

Tests cover catalog insertion for a new tag, idempotency for a repeated tag, exclusion of lead-temperature tags, and the read query's workspace isolation. Migration logic is tested with customer tags from multiple workspaces. The Customer Detail test verifies it uses the catalog API rather than the customer-list API.

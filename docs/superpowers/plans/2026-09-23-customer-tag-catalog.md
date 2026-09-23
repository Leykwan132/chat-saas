# Customer Tag Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Customer Detail's 100-customer tag scan with a small workspace tag catalog.

**Architecture:** A `customerTags` table stores each distinct non-temperature tag for a stable workspace key: organization ID for team workspaces and user ID for personal workspaces. Customer-tag write paths upsert catalog rows. A bounded migration copies historical customer tags, then Customer Detail reads the catalog query rather than `listForCurrentOrg`.

**Tech Stack:** Convex schema, queries, mutations, `@convex-dev/migrations`, React, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-customer-tag-catalog-design.md`

## Global Constraints

- Node.js 22 for every command.
- Convex reads use indexes and bounded results.
- Preserve current tag strings and reserved lead-temperature behavior.
- Do not modify user-owned `.worktrees/` or `test.json`.

## Review Focus

- Existing tags from another workspace must never be returned.
- Repeating a tag must not create duplicate catalog rows.
- Lead-temperature tags must not enter the picker catalog.
- Import and manual-create tags must be cataloged as well as tags added from Customer Detail.
- Historical tags must be populated by a resumable bounded migration.

### Task 1: Catalog storage and customer-tag writes

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/customerTags.ts`
- Modify: `convex/customers.ts`
- Modify: `convex/customerImportPool.ts`
- Test: `convex/customerTags.test.ts`

**Interfaces:**
- Produces: `listForCurrentOrg`, `ensureCustomerTag`, and `isCustomerTagCatalogEligible` from `convex/customerTags.ts`.

- [ ] Write failing tests that assert a tag can be listed only by its own workspace, repeated writes produce one catalog row, and lead-temperature tags are not cataloged.
- [ ] Run `bunx vitest run --exclude '.worktrees/**' convex/customerTags.test.ts --reporter=dot` and confirm the tests fail because the catalog API does not exist.
- [ ] Add `customerTags` with `by_orgId_and_tag` and `by_orgId` indexes; implement bounded workspace listing and idempotent catalog insertion; invoke it from manual customer creation, customer import, direct customer tag addition, and full customer tag replacement.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Historical tag migration

**Files:**
- Create: `convex/customerTagMigration.ts`
- Test: `convex/customerTagMigration.test.ts`

**Interfaces:**
- Consumes: `ensureCustomerTag` eligibility rules and the `customerTags` table.
- Produces: `runBackfillCustomerTags`, a migrations-component runner for production dry runs and resumable execution.

- [ ] Write a failing migration-helper test for a historical customer whose tag is eligible for the catalog and a temperature-tag exclusion.
- [ ] Run `bunx vitest run --exclude '.worktrees/**' convex/customerTagMigration.test.ts --reporter=dot` and confirm it fails because the migration helper does not exist.
- [ ] Add a bounded `@convex-dev/migrations` customer migration that inserts missing eligible catalog records and a runner.
- [ ] Re-run the focused migration test and confirm it passes.

### Task 3: Customer Detail read path

**Files:**
- Modify: `src/pages/CustomerDetailPage.tsx`
- Test: `src/pages/CustomerDetailPage.test.tsx`

**Interfaces:**
- Consumes: `api.customerTags.listForCurrentOrg`.

- [ ] Write a failing source-level regression test that requires Customer Detail to subscribe to the tag catalog and not `api.customers.listForCurrentOrg`.
- [ ] Run `bunx vitest run --exclude '.worktrees/**' src/pages/CustomerDetailPage.test.tsx --reporter=dot` and confirm it fails because the page still loads customer rows for tags.
- [ ] Replace the 100-customer subscription and derived tag memo with the catalog query while retaining the picker’s selected-tag and create-tag behavior.
- [ ] Re-run the focused page test and confirm it passes.

### Task 4: Integration verification

**Files:**
- Modify: `CONTINUITY.md`

- [ ] Run `bunx vitest run --exclude '.worktrees/**' --reporter=dot`.
- [ ] Run `bunx tsc -b --pretty false`.
- [ ] Run `CONVEX_AGENT_MODE=anonymous bunx convex dev --once` to verify the schema and Convex functions deploy.
- [ ] Run the production migration dry-run after deployment, then record the result and production backfill follow-up in `CONTINUITY.md`.

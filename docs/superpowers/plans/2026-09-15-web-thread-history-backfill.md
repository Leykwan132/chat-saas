# Web Thread History Backfill Plan

> **For the implementation agent:** execute these steps in order and stop on any partial-thread conflict.

**Goal:** backfill historical Web Widget ledger messages into their existing Agent thread on the test deployment.

**Approach:** add an optional completion marker on conversations. For each Web conversation, inspect the bounded ledger and Agent-thread messages. Mark it complete when all ledger Agent IDs already exist, copy the ledger chronologically only when the thread is empty, and fail when the data is partial or exceeds the safe batch limit.

**Verification:** unit-test the decision logic, run focused tests and code generation, deploy without `--prod`, dry-run the migration, then run it against the test deployment and inspect its status.

**Rollout boundary:** this task does not run the migration on production or switch the public widget read path.

# Auto De-escalation Implementation Plan

> Execute inline using superpowers:executing-plans, with behavior-first tests and final review.

**Goal:** Move Human Escalation controls under Instructions and resume escalated chats after human inactivity or a teammate trigger phrase.
**Architecture:** Retain escalation workflow nodes. Add validated agent configuration and a dedicated durable timer table/runtime. Trigger hooks observe new escalations and successful human messages; message processing runs after persistence to avoid subsequent persistence overwriting resumed AI.
**Tech Stack:** React, shadcn, Convex scheduler, Vitest/convex-test, Node 22.
**Spec:** docs/superpowers/specs/2026-11-15-auto-deescalation-design.md

## Constraints and review focus

Preserve escalation logic, assignments and existing configurations. New code files under 300 lines, no comments or silent fallbacks. Do not deploy. Check old timers, disabled settings, closed/reassigned conversations, customer/AI/failed messages and multiple existing escalation rules.

## Task 1: Backend settings and runtime

- [x] Write failing Convex tests for settings validation/auth and timer/keyword resolution, inactivity reset, stale escalation, closure, assignment and disabling.
- [x] Run tests on Node 22 and confirm expected feature-missing failures.
- [x] Add `convex/autoDeescalationConfig.ts`, `convex/autoDeescalation.ts`, `convex/autoDeescalationRuntime.ts` and dedicated schema fields/table. Settings API takes agentId, enabled, inactivityMinutes, keywords; normalizes phrases and validates 1–43200 whole minutes.
- [x] Hook conversations/messages in `convex/triggers.ts`. Successful human message inserts or transitions schedule processing after persistence. Runtime atomically resolves and logs without initiating generation.
- [x] Run focused runtime suites and existing escalation tests.

## Task 2: Instructions controls and canvas visibility

- [x] Update canvas/catalog tests to require escalation nodes/incident edges hidden and the add option absent.
- [x] Implement `HumanEscalationPanel.tsx` using existing workflow editing controls for every existing escalation node. Reuse authenticated workflow ensure/add/remove mutations for agents without a rule; no duplicate endpoint.
- [x] Implement `AutoDeescalationControl.tsx` with switch, minutes and newline-separated phrases; explicit save and error feedback.
- [x] Mount beneath Instructions, update guidance, hide escalation nodes/edges only in graph presentation and filter the frontend add catalog. Preserve backend types and workflows.
- [x] Run affected UI/workflow suites.

## Task 3: Verify and handoff

- [x] Review changed code for race conditions, access checks and existing rule compatibility.
- [x] Run focused tests, TypeScript and build for this planned cross-layer change. Check diff formatting and new module sizes.
- [x] Record unreleased work and verification in CONTINUITY.md; no production changelog entry.

2026-11-15 [CODE] Ruling: reuse existing workflow mutations for rule creation instead of a new endpoint; keep stable APIs. Preserve Instructions rules across workflow template replacement, and filter escalation actions from template replacement payloads. Review fixes separate setting revisions from activation generations, track human ownership, and use successful-send time for queued messages.

2026-11-15 [TOOL] Complete locally: 67 focused suites / 237 tests; final affected UI rerun 3/3; backend TypeScript, app build, new-module lint and diff checks passed on Node 22. Final review clean. No deployment; codegen server analysis compatibility error remains recorded in CONTINUITY.md.

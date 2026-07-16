# KiloBot Public Help Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and connect a production-ready public KiloBot help center at `docs.kilobot.app`.

**Architecture:** Keep the help center as the existing isolated Docusaurus application in `kilobot-docs`. Use a self-hosted build-time search index, explicit sidebars, focused MDX guides, and small home-page components; link to it from the existing Vite product through one exported docs URL.

**Tech Stack:** Docusaurus 3.10, React 19, TypeScript 6, MDX, CSS Modules, `@cmfcmf/docusaurus-search-local`, Node test runner, Vitest.

## Global Constraints

- Run every script with Node 22 in the same shell command.
- Keep every code file below 300 lines.
- Do not add comments unless a non-obvious workaround cannot be made self-explanatory.
- Use exact product labels and document only repository-verified behavior.
- The public site URL is `https://docs.kilobot.app`.
- Builds fail on broken links.

---

### Task 1: Lock the documentation contract

**Files:**
- Create: `kilobot-docs/tests/help-center-structure.test.mjs`
- Create: `kilobot-docs/tests/help-center-brand.test.mjs`
- Modify: `kilobot-docs/package.json`

**Interfaces:**
- Produces: executable `npm test` contract for required routes, sidebar groups, metadata, search, branding, and external product links.

- [ ] Write Node tests that read the Docusaurus config, sidebar, home page, CSS, and required MDX files and assert the design contract.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use 22 && npm test` from `kilobot-docs` and confirm failures report missing KiloBot help-center files and configuration.
- [ ] Add the Node test command without changing production behavior.
- [ ] Run the tests again and retain the expected content failures for the implementation tasks.

### Task 2: Build the KiloBot documentation shell

**Files:**
- Modify: `kilobot-docs/docusaurus.config.ts`
- Modify: `kilobot-docs/sidebars.ts`
- Modify: `kilobot-docs/src/css/custom.css`
- Modify: `kilobot-docs/src/pages/index.tsx`
- Modify: `kilobot-docs/src/pages/index.module.css`
- Create: `kilobot-docs/src/components/HomeCategoryGrid.tsx`
- Create: `kilobot-docs/src/components/HomeCategoryGrid.module.css`
- Replace: `kilobot-docs/static/img/logo.svg`
- Create: `kilobot-docs/static/img/icon.svg`
- Modify: `kilobot-docs/package.json`
- Modify: `kilobot-docs/package-lock.json`

**Interfaces:**
- Consumes: required route and brand assertions from Task 1.
- Produces: branded responsive shell, explicit sidebar, local search, home page, and production metadata.

- [ ] Install `@cmfcmf/docusaurus-search-local` with Node 22.
- [ ] Configure title, description, production URL, local search, navbar, footer, color mode, metadata, and disabled blog.
- [ ] Implement the KiloBot home page and category grid with responsive, theme-aware styles.
- [ ] Replace starter Docusaurus imagery with the KiloBot icon and wordmark.
- [ ] Run `npm test` and confirm only missing-content assertions remain.

### Task 3: Write the product documentation

**Files:**
- Replace: `kilobot-docs/docs/**`

**Interfaces:**
- Consumes: explicit sidebar IDs and routes from Task 2.
- Produces: complete task-oriented onboarding and reference content for every in-scope product area.

- [ ] Write Start Here guides for welcome, core concepts, Launch Guide, and workspace creation.
- [ ] Write agent, Knowledge Base, Workflow, reminder, follow-up, and channel guides.
- [ ] Write Services, Availability, Calendar, Inbox, Contacts, Quick Replies, Templates, and Broadcast guides.
- [ ] Write Lead Assignment, team, roles, Analytics, usage, troubleshooting, and support guides.
- [ ] Remove all Docusaurus tutorial and demo content.
- [ ] Run `npm test` and confirm the complete content contract passes.

### Task 4: Connect KiloBot to the help center

**Files:**
- Create: `src/lib/docsLinks.ts`
- Create: `src/lib/docsLinks.test.ts`
- Modify: `src/components/site-header/siteHeaderLinks.ts`
- Modify: `src/components/site-header/SiteHeaderNavigation.tsx`
- Modify: `src/components/site-header/SiteHeaderActions.tsx`
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/components/SupportHoverCard.tsx`
- Modify: `src/components/SupportHoverCard.test.ts`

**Interfaces:**
- Produces: `KILOBOT_DOCS_URL` and public/authenticated navigation entry points.

- [ ] Add failing Vitest coverage for the canonical docs URL and each required entry point.
- [ ] Run the focused tests and confirm they fail because the docs link does not exist.
- [ ] Implement a shared canonical URL and external-link-aware header rendering.
- [ ] Add Docs to the footer and Help center to authenticated support.
- [ ] Run the focused tests and confirm they pass.

### Task 5: Verify the release

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: build and verification receipts.

- [ ] Run docs tests, docs typecheck, and the production Docusaurus build with Node 22.
- [ ] Run focused main-app tests and targeted ESLint with Node 22.
- [ ] Check every changed code file is below 300 lines.
- [ ] Run `git diff --check` and scan for starter Docusaurus copy, placeholder domains, broken internal links, and stale demo assets.
- [ ] Update the continuity ledger with the final state and exact verification outcomes.

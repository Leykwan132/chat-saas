# CLI Development and Production Deployments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe direct Wrangler commands that deploy `main` to production and `dev` to development with isolated ignored build-variable files.

**Architecture:** Named Wrangler environments select the production or development Worker. A small deployment entrypoint validates the target, current Git branch, and required environment file before running the matching Vite build and Wrangler deploy.

**Tech Stack:** Bun, Node.js 22, Vite 8, Wrangler 4, Vitest

## Global Constraints

- Production branch is exactly `main`.
- Development branch is exactly `dev`.
- Production Worker name is exactly `kilobot`.
- Development Worker name is exactly `kilobot-dev`.
- Local value files must never be committed.
- Example files must contain the complete required key set with blank values.

---

### Task 1: CLI deployment environments

**Files:**
- Create: `scripts/deploy-worker.mjs`
- Create: `scripts/deploy-worker.test.ts`
- Create: `.env.production`
- Create: `.env.dev`
- Create: `.env.production.example`
- Create: `.env.dev.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: deployment target argument `production` or `dev`
- Produces: `bun run deploy:prod` and `bun run deploy:dev`

- [ ] **Step 1: Write the failing deployment contract test**

Assert that package scripts call the deployment entrypoint, Wrangler maps production to `kilobot` and development to `kilobot-dev`, value files are ignored, example files are committed exceptions, and both examples contain the exact required keys.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run scripts/deploy-worker.test.ts
```

Expected: failure because the deployment entrypoint, named environments, scripts, and templates do not exist.

- [ ] **Step 3: Implement the minimal deployment configuration**

Add named Wrangler environments, the two package scripts, the guarded deployment entrypoint, explicit ignore rules with example exceptions, and matching blank value/example files.

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run scripts/deploy-worker.test.ts
```

Expected: one passing test file with no failures.

- [ ] **Step 5: Validate both deployment artifacts without publishing**

Run both Vite builds with temporary validation values, then run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx wrangler deploy --env dev --dry-run
source ~/.nvm/nvm.sh && nvm use 22 && bunx wrangler deploy --env production --dry-run
```

Expected: both commands exit successfully and identify `kilobot-dev` and `kilobot`.

- [ ] **Step 6: Commit the implementation**

Stage the deployment files, templates, docs, test, and continuity update while confirming `.env.dev` and `.env.production` remain ignored.

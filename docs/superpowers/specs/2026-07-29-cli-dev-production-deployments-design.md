# CLI Development and Production Deployments

## Goal

Deploy the application directly with Wrangler while keeping development and production configuration isolated and local values out of Git.

## Deployment contract

- `main` deploys the production Worker named `kilobot`.
- `dev` deploys the development Worker named `kilobot-dev`.
- A deployment command must stop before building when it is run from the wrong Git branch.
- `bun run deploy:prod` builds with Vite mode `production` and deploys Wrangler environment `production`.
- `bun run deploy:dev` builds with Vite mode `dev` and deploys Wrangler environment `dev`.

## Environment files

- `.env.production` contains production build values.
- `.env.dev` contains development build values.
- Both value files are ignored by Git.
- `.env.production.example` and `.env.dev.example` are committed with the complete required key set and blank values.
- Vite loads the matching file during its build, so `VITE_*` values are embedded only in the intended artifact.

## Wrangler environments

- The top-level Worker configuration remains the shared configuration.
- `env.production.name` is `kilobot`.
- `env.dev.name` is `kilobot-dev`.
- The production environment remains attached to the existing production Worker instead of creating `kilobot-production`.

## Failure behavior

- Unknown deployment targets fail.
- A dirty worktree remains allowed because deployment correctness depends on the current source tree and explicit branch, not commit publication.
- Missing required environment values fail during a preflight check before the build.
- Wrangler authentication and deployment failures pass through unchanged.

## Verification

- A focused source-contract test checks branch mapping, Worker names, scripts, ignored value files, committed examples, and required keys.
- Both modes complete a production Vite build after temporary validation values are supplied without modifying the ignored user files.
- Both Wrangler environments complete `deploy --dry-run`.

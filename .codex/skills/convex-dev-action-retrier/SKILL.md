---
name: convex-dev-action-retrier
description: Add reliability to an unreliable external service. Retry idempotent calls a set number of times. Use this skill whenever working with Action Retrier or related Convex component functionality.
version: 0.3.1
---

> Agents: read this skill fully before writing code that uses Action Retrier. Follow the installation and configuration steps exactly.

# Action Retrier

## Instructions

The Action Retrier component automatically retries failed Convex actions with exponential backoff, making external API calls and network operations more reliable. It handles transient failures by running your action up to a configurable number of times before giving up. You get async tracking of run status, cancellation support, and optional completion callbacks.

### Installation

```bash
npm install @convex-dev/action-retrier
```

Current npm version: `@convex-dev/action-retrier@0.3.1`

## Use cases

- **Third-party API integration** - Retry payment processing, email sending, or webhook calls that fail due to network timeouts or service unavailability
- **External service dependencies** - Handle flaky connections to databases, file storage, or authentication providers that occasionally return 5xx errors
- **Distributed system resilience** - Automatically recover from transient network partitions or temporary service degradation without manual intervention
- **Batch processing workflows** - Ensure data synchronization tasks complete successfully even when individual operations encounter intermittent failures
- **Critical business operations** - Add reliability guarantees to actions that must eventually succeed, like order fulfillment or user onboarding steps

## How it works

Install the component into your Convex app configuration, then create an `ActionRetrier` instance pointing to the component. Call `retrier.run(ctx, actionReference, args)` from mutations or actions to execute your target action with automatic retry logic.

The component uses exponential backoff with configurable parameters: `initialBackoffMs` for the first retry delay, `base` for the backoff multiplier, and `maxFailures` for retry limits. Failed runs sleep progressively longer between attempts until success or exhaustion.

Run tracking happens through a returned `RunId` that lets you query status with `retrier.status()`, cancel execution with `retrier.cancel()`, or clean up completed runs with `retrier.cleanup()`. Optional `onComplete` mutation callbacks execute exactly once when runs finish, regardless of success or failure.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Action Retrier is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40convex-dev%2Faction-retrier)
- [GitHub repository](https://github.com/get-convex/action-retrier)
- [Convex Components Directory](https://www.convex.dev/components/retrier)
- [Convex documentation](https://docs.convex.dev)

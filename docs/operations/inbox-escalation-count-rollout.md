# Inbox escalation count rollout

Deploy the backend first, complete the backfill, then deploy the frontend.

1. Deploy this revision's Convex backend, including the two counter tables, status indexes, transactional summary trigger and backfill function. The existing frontend remains compatible.
2. Using Node 22 and the production Convex deployment, start the backfill:

   ```sh
   nvm use 22
   npx convex run --prod inboxEscalationCounts:backfill '{"cursor":null}'
   ```

3. Wait for the entire backfill to finish. The command starts a chain of scheduled batches of 100 summaries; its return does not mean all batches are complete. In the Convex dashboard, verify that `inboxEscalationCounts` contains a row with `scopeKey` equal to `backfill-complete` and that the scheduled backfill chain has no failed or pending batches.
4. Deploy the frontend. Confirm that the Escalated badge includes an older pending case outside the first 50 chats and that clicking it retrieves that case without scrolling through the unfiltered inbox. Resolve a case and confirm the count decreases.

Live summary changes update the counters transactionally while the backfill runs. Membership records make retries from `cursor: null` idempotent. If a batch fails, investigate the error and restart from `cursor: null`; do not manually alter counter values or delete membership rows.

Until the backfill completion marker exists, the count query returns `null` and the new frontend omits the badge rather than displaying a partial total. The Escalated list uses an independent indexed query. Other sidebar counters retain their existing behavior.

The backfill initializes counters from existing Inbox summaries; it does not rebuild missing or stale summaries from conversations. Existing summary projection repair remains a separate operation.

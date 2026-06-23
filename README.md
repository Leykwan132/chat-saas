# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# chat-saas

## Admin contact dashboard

The private admin dashboard lives at `/admin/contact`. It reads contact submissions from Convex and can send Telegram alerts when new requests arrive.

Set these Convex environment variables with `npx convex env set`:

```bash
npx convex env set ALLOWED_ADMIN_EMAIL '["leykwan132@gmail.com"]'
npx convex env set ADMIN_CODE '123456'
npx convex env set BOT_TOKEN '<telegram-bot-token>'
npx convex env set ADMIN_TELEGRAM_CHAT_ID '<your-chat-id>'
```

### Configuring Credit Reset Period (For Testing)

To test the credit reset worker and logic faster in development, you can configure the duration of the reset cycle using the `CREDIT_RESET_PERIOD` environment variable in Convex:

```bash
npx convex env set CREDIT_RESET_PERIOD 'minutes'
```

Supported values:
- `month` (default): Resets on the same day next month.
- `days`: Resets after 1 day (24 hours).
- `hours`: Resets after 1 hour.
- `minutes`: Resets after 1 minute.

If you have existing contact requests with legacy statuses (`new`, `reviewed`), run the one-off migration:

```bash
npx convex run contactAdminMigration:migrateContactRequestStatuses
```

## Conversation History Logging

All key user and AI actions taken in a conversation are audited and stored in the `conversationLogs` table. The frontend displays these events chronologically in the **Action History** collapsible section within the conversation details panel.

### Actions Logged

The following actions are logged and displayed:

| Action | Log Trigger | Actor | Metadata Logged |
|---|---|---|---|
| **Thread Created** | New conversation / thread initialized | System / User | `service` |
| **Broadcast Sent** | WhatsApp broadcast campaign sent successfully | User (creator) | `templateName`, `scheduleId` |
| **Follow-up Sent** | Automated follow-up sent successfully | User (creator) | `templateName`, `ruleId`, `attemptNumber` |
| **AI Replies Enabled** | AI replies turned on | User | - |
| **AI Replies Disabled** | AI replies turned off | User | - |
| **Assignee Changed** | Conversation assigned / reassigned | User | `assigneeUserId`, `assigneeName` |
| **Escalation Resolved** | Human escalation resolved | User | - |
| **Tag Added** | Tag added to conversation | User | `tag` |
| **Tag Removed** | Tag removed from conversation | User | `tag` |
| **Event Booked** | Calendar appointment booked (manual or AI-agent) | User / AI | `eventId`, `eventTitle`, `startAt` |
| **Event Updated** | Calendar appointment details modified | User / AI | `eventId`, `eventTitle`, `startAt` |
| **Event Cancelled** | Calendar appointment cancelled | User / AI | `eventId` |
| **Event Deleted** | Calendar appointment deleted | User | `eventId`, `eventTitle` |
| **Lead Status Changed** | Lead temperature changed (e.g. Hot, Warm, Cold) | User | `from`, `to` |

## Team Analytics

Team analytics use Convex aggregate data for fast counts and sums across conversations, members, channels, and topics.

### Aggregate Design

- `analyticsMetricEntries` is the normal Convex source table. Each row stores one aggregate-able value such as `convertedCount`, `firstReplyDurationMs`, or `messageSentCount`.
- `analyticsMetrics` is the `@convex-dev/aggregate` component instance that listens to `analyticsMetricEntries`.
- `convex/triggers.ts` registers `triggers.register("analyticsMetricEntries", analyticsMetrics.trigger())`, so inserts, updates, and deletes in the source table update the aggregate component.
- The aggregate component groups by `namespace`, not by arbitrary fields. Every analytics namespace includes both scope and metric, for example:
  - `team:<orgId>:metric:firstReplyCount`
  - `member:<orgId>:<workosUserId>:metric:messageSentCount`
  - `channel:<orgId>:service:whatsapp:metric:channelConvertedCount`
  - `topic:<orgId>:<topicId>:metric:topicMentionCount`
- The `metric` field is still stored on `analyticsMetricEntries` for debugging, indexes, and idempotent replacement, but aggregate reads request metric-specific namespaces.

### Metric Facts

`conversationAnalyticsFacts` stores one derived row per inbox conversation. It caches values such as:

- `firstCustomerMessageAt`: earliest incoming customer message.
- `firstOutgoingAt`: earliest outgoing reply after the first customer message.
- `firstHumanOutgoingAt`: earliest human-authored outgoing reply after the first customer message.
- `convertedAt`: when the `converted` tag is first added.
- `droppedAt`: when the linked customer's lead temperature is `Cold`.

Duration metrics are stored as per-conversation aggregate source rows:

- `firstReplyDurationMs = firstOutgoingAt - firstCustomerMessageAt`
- `conversionDurationMs = convertedAt - firstCustomerMessageAt`

Average metrics are computed at query time:

- Average first reply time = sum of `firstReplyDurationMs` / sum of `firstReplyCount`
- Average time to conversion = sum of `conversionDurationMs` / sum of `convertedCount`

Drop rate is based on lead outcome: a conversation counts as dropped when its linked customer lead temperature is `Cold`.

### Topic Detection

A daily Convex cron runs topic detection over recent conversations that are missing a topic or have new messages since their last topic assignment. The detector sends a bounded transcript plus existing org topics to the LLM, reuses an existing topic when possible, and stores the result in `conversationTopics` and `conversationTopicAssignments`.

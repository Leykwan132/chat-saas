# Telegram webhook receiver design

## Goal

Receive Telegram webhook updates at Convex and emit safe diagnostic logs while the bot integration is being verified.

## Route and authentication

`convex/http.ts` registers `POST /webhook/telegram`. A dedicated `convex/telegramWebhook.ts` HTTP action reads the required `TELEGRAM_WEBHOOK_SECRET` deployment environment value and accepts a request only when its `X-Telegram-Bot-Api-Secret-Token` header matches.

Missing or invalid credentials return `401`. A missing deployment secret returns `500`, and malformed JSON returns `400`.

## Processing

An accepted update emits one structured log containing only the update ID, recognized event type, chat ID, and sender ID. The handler must never log a message body or raw Telegram payload. It performs no database writes and sends no bot response. Accepted updates return `200`.

## Tests

Focused tests prove that an authenticated update returns `200` and only logs the approved metadata, while invalid credentials and malformed payloads are rejected.

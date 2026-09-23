# Inbox History Search Design

## Goal

Let an Inbox operator search every current, connected conversation in the selected workspace and agent scope without loading the Inbox or its message history into the browser.

## Search scope

The search box uses one query string and returns two sections only when it is non-empty.

- Chats searches a contact's name, phone number, email address, and contact address.
- Matched Messages searches customer-visible incoming and outgoing text-message content.
- Media-only messages, internal logs, tool output, and system records are excluded.
- Both sections include only conversations belonging to the authenticated workspace, current agent scope, and currently connected channels.

## Result presentation

Chats appears first with at most five contact matches. It retains the existing Inbox conversation row presentation and latest-activity date.

Matched Messages appears below Chats with 20 message hits per page. A message is a separate hit even when another hit belongs to the same conversation. Each row retains the conversation identity and current chips, replaces the normal preview with the matched message content, shows that message's own timestamp at the top right, and highlights every case-insensitive matched search term. Selecting either result opens its conversation.

An empty query retains the current newest-first, 50-item Inbox summary pagination. Search does not show an exact total.

## Data model

`inboxConversationSummaries` gains a required `contactSearchText` field containing the contact name, phone number, email address, and contact address. A full-text search index filters this field by workspace, selected agent, and connection state.

`inboxMessageSearchDocuments` is a compact one-row-per-searchable-message projection. It contains the source `messageId`, conversation ID, workspace scope, optional assigned-agent ID, connection state, message content, and message timestamp. Its full-text index searches message content and filters by the same scope fields.

The message projection deliberately does not copy tags, lead temperature, booking state, or other conversation-row presentation fields. Search queries read the current `inboxConversationSummaries` rows for their at-most-20 message hits, so chips and contact identity stay current without rewriting every historical message after an unrelated customer update.

## Freshness and lifecycle

The existing trigger-wrapped writes maintain both projections.

- A text message insert, update, or deletion creates, updates, or removes its search document.
- A conversation summary scope change, including agent reassignment or channel disconnect/reconnect, refreshes the searchable message documents for that conversation.
- A summary update that only changes presentation or latest-message state does not rewrite historical search documents.
- A deleted conversation removes its summary and all its message-search documents.

This makes an affected message disappear from search in the same trigger-wrapped mutation chain as the corresponding Inbox summary change. No cron or delayed reconciliation is part of the read path.

## Query behavior

The server authenticates the current user and derives workspace scope; callers never provide an organization or user scope. The selected agent ID is checked against that scope.

For a non-empty search query, the backend exposes two paginated queries:

- contact search returns up to five matching summary rows;
- message search returns 20 matching search documents and their current summary-row data.

Convex full-text search ranks message results by relevance. The displayed date is the matched message's timestamp, not the conversation's latest timestamp. The UI sends a debounced query so intermediate keystrokes do not start a new search request.

## Migration and reconciliation

The schema first widens with the new summary field, search indexes, and projection table. New and changed writes populate both projections before historical data is backfilled.

A resumable migration rebuilds every Inbox summary to populate `contactSearchText`, then creates a search document for each existing eligible text message. A bounded reconciliation verifies that each qualifying message has exactly one document with current scope fields and removes documents whose message or conversation is no longer eligible.

## Validation

Tests cover workspace and agent isolation, disconnected-channel exclusion, text-only eligibility, message update and deletion, reassignment and disconnect propagation, contact and message section limits, multiple hits from one conversation, timestamp selection, case-insensitive highlighting, and the unchanged empty-search Inbox behavior.

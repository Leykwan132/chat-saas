# Broadcast Inbox Message Design

## Goal

Render successful WhatsApp broadcasts in the inbox as one visually distinct message block containing the template header asset, rendered template body, and a bottom-left icon with the label `Broadcast`.

## Message Identity

Broadcast identity must be structured data rather than inferred from visible text.

- Add an optional `messageKind` field to persisted channel messages with `broadcast` as the initial supported value.
- Add optional broadcast presentation metadata containing the header asset URL, MIME type, filename, and header format.
- Pass the same identifier and presentation metadata into the Agent thread message metadata when ingesting an outgoing broadcast.
- Map the identifier to `isBroadcast` on the inbox UI message type.
- Keep ordinary messages without the field so their behavior and appearance remain unchanged.

The message ledger remains authoritative for channel delivery state. Agent thread metadata carries the same identity because the inbox message list is rendered from Agent messages and enriched from ledger rows.

## Template Presentation Data

The WhatsApp template payload builder will return presentation data alongside the Meta payload:

- The rendered body text after customer variables are resolved.
- An optional header asset with its public URL, MIME type, filename, and header format.

The header asset comes from the prepared `whatsappTemplateMediaAssets` record already used for the Meta send. Its public URL is derived from the stored R2 key. No additional upload or external fetch is needed.

Supported header formats are image, video, and document. A template without header media returns no presentation asset.

## Broadcast Completion

After Meta accepts a broadcast send, the completion mutation will ingest one outgoing logical message with:

- `messageKind: "broadcast"`
- The rendered template body as the visible text
- The prepared header asset in dedicated broadcast presentation metadata
- Existing external message ID, author, agent assignment, timestamp, and delivery state

The old visible `Marketing message sent` prefix will be removed. The structured broadcast marker replaces it.

If the Meta send succeeds but presentation metadata is unexpectedly missing, completion must still persist a broadcast message with the available template body. It must not invent an asset or parse the Meta payload to recover one.

## Inbox Rendering

An outgoing message with `isBroadcast` renders inside a dedicated neutral frame:

1. Header asset preview at the top when present
2. Rendered template text beneath the asset
3. A compact megaphone icon and `Broadcast` label aligned to the bottom-left

The asset, text, and label belong to the same visual block. Existing delivery receipts, timestamp, sender label, reactions, and attachment interactions remain outside or around the block exactly as they work for regular outgoing messages.

The broadcast frame uses a neutral background and subtle border so it is distinguishable without looking like an alert. It does not use a green icon background or a WhatsApp logo.

## Data Flow

1. The template payload builder resolves body variables and prepared header media.
2. The broadcast worker sends the Meta template payload and returns the presentation data.
3. The completion mutation ingests the outgoing message with broadcast metadata and optional media.
4. The thread persistence layer writes the marker and optional presentation metadata to both the message ledger and Agent metadata.
5. Inbox mapping exposes `isBroadcast` and attachments on one UI message.
6. The inbox renderer selects the broadcast frame only when `isBroadcast` is true.

## Error Handling

- Existing template-media preparation errors continue to block the Meta send before completion.
- A missing configured media CDN base URL remains an explicit error when a prepared header asset needs a public inbox URL.
- Unknown or absent broadcast metadata renders as a normal message.
- Existing messages containing `Marketing message sent` are not retroactively classified by text.

## Testing

- Payload presentation tests cover body-only templates and image, video, and document headers.
- Broadcast content tests confirm visible content contains only the rendered template body.
- Ingest and mapping tests confirm `messageKind: "broadcast"` reaches `isBroadcast` and keeps typed header presentation metadata on the same UI message.
- Renderer tests confirm the `Broadcast` label is conditional and normal messages do not receive the broadcast frame.
- Focused broadcast and inbox tests run under Node 22, followed by a whitespace check of touched files.

## Out of Scope

- Reclassifying historical broadcast messages from their text
- Changing Meta send payload behavior
- Supporting multiple template header assets
- Redesigning regular inbox message bubbles

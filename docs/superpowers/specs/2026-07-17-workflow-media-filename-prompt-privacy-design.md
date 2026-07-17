# Workflow Media Filename Prompt Privacy Design

## Goal

Customer-visible messages sent alongside workflow media must never mention the uploaded media filename. A reply may naturally say that the requested image, video, or file is being sent, but it must not emit text such as `*(Image: Type_A_layout.jpg sedang dihantar sekarang)*`.

## Scope

This change is prompt-only. It does not add deterministic output sanitization, rewrite generated messages, alter media delivery, or remove filenames from internal workflow records.

## Design

The structured workflow action planner may continue receiving filenames as internal asset-identification context. Its prompt must explicitly require `responseGuidance` to omit uploaded filenames and prohibit instructing the later reply to display them.

The final customer-reply guidance must no longer list filenames. Selected assets will be described only by their workflow node title and media type. The same guidance must state that uploaded filenames are internal metadata and must never appear in customer-visible content, including parenthetical status text, markdown, captions, or attachment descriptions.

The general workflow runtime prompt will extend its existing ban on media URLs, client IDs, and internal notes to include uploaded filenames. This keeps the privacy rule present even when the final reply is produced outside the matched-media guidance path.

## Data Flow

1. The action planner receives workflow media metadata and chooses matched media nodes.
2. The planner returns filename-free response guidance.
3. The final reply model receives selected asset titles and media types without filenames.
4. The backend sends the unchanged media payload separately from the generated customer text.

## Testing

Prompt contract tests will use an uploaded asset named `Type_A_layout.jpg` and verify:

- The final reply guidance does not contain `Type_A_layout.jpg`.
- The final reply guidance explicitly forbids customer-visible filenames.
- The action planner prompt explicitly requires filename-free response guidance.
- The workflow runtime prompt explicitly classifies filenames as internal metadata that must not be pasted into the reply.
- Existing selected-media send-now guidance remains intact.

## Success Criteria

- No uploaded filename is included in the prompt that directly guides the customer-visible media reply.
- Every relevant prompt layer explicitly prohibits filename disclosure.
- Media matching and sending behavior remain unchanged.
- No deterministic sanitizer or output-rewriting logic is introduced.

# Same-Language Response Prompt Design

## Goal

Every generated customer-facing reply must use the same language as the user's prompt.

## Scope

This is a prompt-contract change only. It applies globally to runtime inbox reply generation and does not alter model selection, stored agent prompts, workflow execution, message persistence, or response post-processing.

## Design

Extend the existing `chatResponseFormattingBlock` in `convex/chat/responseFormatting.ts`. That block is already appended to every runtime agent instruction assembled in `convex/chat/threads.ts`, so one change covers existing agents, custom prompts, and future agents without duplicating the rule.

Add this instruction:

> IMPORTANT: You must always respond in the exact same language that the user uses in their prompt. Do not translate the user's input before answering.

Follow it with two examples that contrast Chinese and English:

> User: "你好，请问你们今天营业吗？"  
> Assistant: "你好！我们今天营业。请问有什么可以帮助你？"
>
> User: "Hello, are you open today?"  
> Assistant: "Hello! Yes, we are open today. How can I help you?"

The examples demonstrate the desired behavior without adding language-detection code or maintaining a supported-language list.

## Alternatives Considered

### Separate language prompt block

This would isolate the concern but adds a new module and assembly dependency for a single instruction. The existing response-formatting block is the smaller stable boundary.

### Agent-template updates

Adding the rule to each template would duplicate content and would not reliably affect existing agents or custom system prompts.

## Verification

Add a focused contract test in `convex/chat/responseFormatting.test.ts` that requires:

- The exact same-language instruction.
- The Chinese user and assistant example.
- The English user and assistant example.

Run the focused test under Node.js 22. No live model call is required because this change controls the prompt contract rather than deterministically enforcing output content.

## Success Criteria

- Every runtime agent instruction includes the same-language rule and both examples.
- Existing response-formatting rules remain unchanged.
- The focused prompt-contract test passes under Node.js 22.
- No unrelated files are modified.

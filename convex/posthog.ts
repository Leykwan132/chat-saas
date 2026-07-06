/**
 * PostHog LLM analytics helper for Convex actions.
 *
 * Uses the HTTP capture API directly because OpenTelemetry's Node.js SDK
 * cannot run in Convex's V8/Cloudflare Workers runtime. `fetch` is available
 * as a global in all Convex action environments.
 *
 * Requires the POSTHOG_PROJECT_TOKEN environment variable to be set in the
 * Convex dashboard (Settings → Environment Variables). The optional
 * POSTHOG_HOST variable defaults to https://us.i.posthog.com.
 */

interface CaptureAIGenerationArgs {
  /** PostHog distinct_id — use the WorkOS userId when available. */
  distinctId: string;
  /** Trace ID groups related generation events (e.g. threadId or conversationId). */
  traceId: string;
  /** Human-readable name for this generation step. */
  spanName: string;
  /** Full model identifier, e.g. "deepseek/deepseek-v4-flash". */
  model: string;
  /** Provider name, e.g. "openrouter". */
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  /** Wall-clock time for the entire LLM call in seconds. */
  latencySeconds?: number;
  isError?: boolean;
  error?: string;
}

export async function captureAIGeneration(args: CaptureAIGenerationArgs): Promise<void> {
  const projectToken = process.env.POSTHOG_PROJECT_TOKEN;
  if (!projectToken) return;

  const host = (process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '');

  try {
    await fetch(`${host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: projectToken,
        event: '$ai_generation',
        distinct_id: args.distinctId,
        properties: {
          $ai_trace_id: args.traceId,
          $ai_span_name: args.spanName,
          $ai_model: args.model,
          $ai_provider: args.provider,
          $ai_input_tokens: args.inputTokens,
          $ai_output_tokens: args.outputTokens,
          ...(args.latencySeconds !== undefined && { $ai_latency: args.latencySeconds }),
          ...(args.isError && { $ai_is_error: true }),
          ...(args.error && { $ai_error: args.error }),
        },
      }),
    });
  } catch {
    // Non-blocking: observability failures must never break product functionality.
  }
}

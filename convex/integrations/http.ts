import type { HttpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { verifyIntegrationRequest } from "../../shared/integrations/assertion";
import { unwrapCursor, wrapCursor } from "../../shared/integrations/cursor";
import {
  INTEGRATION_PATH,
  integrationResultSchema,
  RESPONSE_LIMIT,
} from "../../shared/integrations/contracts";
import {
  IntegrationError,
  errorResponse,
} from "../../shared/integrations/errors";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new IntegrationError("INTEGRATION_NOT_CONFIGURED", 503);
  return value;
}

export function registerIntegrationRoutes(router: HttpRouter) {
  router.route({ path: INTEGRATION_PATH, method: "POST", handler: read });
}

export const read = httpAction(async (ctx, request) => {
  const startedAt = Date.now();
  if (process.env.INTEGRATION_ENABLED !== "true")
    return errorResponse(new IntegrationError("INTEGRATION_DISABLED", 503));
  let input;
  try {
    input = await verifyIntegrationRequest(request, {
      jwks: JSON.parse(required("INTEGRATION_VERIFICATION_JWKS")),
      environment: required("INTEGRATION_ENVIRONMENT"),
    });
    if (input.principal.issuer !== required("WORKOS_CONNECT_ISSUER"))
      throw new Error("Invalid source issuer");
  } catch (error) {
    return errorResponse(
      error instanceof IntegrationError
        ? error
        : new IntegrationError("INVALID_SERVICE_ASSERTION", 401),
    );
  }
  const { principal } = input;
  const originalOperation = input.operation;
  try {
    let operation = originalOperation;
    const cursorToken =
      operation.operation === "get_connection_context"
        ? operation.agentCursor
        : "cursor" in operation
          ? operation.cursor
          : undefined;
    if (cursorToken && operation.operation !== "get_agent_snapshot") {
      let raw: string;
      try {
        raw = await unwrapCursor(
          cursorToken,
          principal,
          operation,
          required("INTEGRATION_CURSOR_SECRET"),
        );
      } catch {
        throw new IntegrationError("INVALID_CURSOR", 400);
      }
      operation =
        operation.operation === "get_connection_context"
          ? { ...operation, agentCursor: raw }
          : { ...operation, cursor: raw };
    }
    await ctx.runMutation(
      internal.integrations.connections.ensurePendingConnection,
      { principal },
    );
    const serialized: string = await ctx.runQuery(
      internal.integrations.queries.executeRead,
      { principal, operation },
    );
    const result = integrationResultSchema.parse(JSON.parse(serialized));
    if (result.nextCursor)
      result.nextCursor = await wrapCursor(
        result.nextCursor,
        principal,
        originalOperation,
        required("INTEGRATION_CURSOR_SECRET"),
      );
    const body = JSON.stringify(result);
    if (new TextEncoder().encode(body).length > RESPONSE_LIMIT)
      throw new IntegrationError("RESPONSE_TOO_LARGE", 413);
    await ctx.runMutation(internal.integrations.audit.append, {
      consentId: principal.consentId,
      orgId: principal.orgId,
      operation: operation.operation,
      outcome: "success",
      requestId: input.requestId,
      durationMs: Date.now() - startedAt,
      resultCount: result.items.length,
    });
    return new Response(body, {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const known = [
      "SNAPSHOT_NOT_READY",
      "CONNECTION_APPROVAL_REQUIRED",
      "PERMISSION_DENIED",
      "NOT_FOUND",
      "WORKSPACE_UNAVAILABLE",
      "PARTNER_WORKSPACE_UNSUPPORTED",
      "CONNECTION_MISMATCH",
    ];
    const code =
      error instanceof ConvexError &&
      typeof error.data === "string" &&
      known.includes(error.data)
        ? error.data
        : null;
    try {
      await ctx.runMutation(internal.integrations.audit.append, {
        consentId: principal.consentId,
        orgId: principal.orgId,
        operation: originalOperation.operation,
        outcome: code ?? "error",
        requestId: input.requestId,
        durationMs: Date.now() - startedAt,
        resultCount: 0,
      });
    } catch {
      return errorResponse(new IntegrationError("AUDIT_UNAVAILABLE", 503));
    }
    return errorResponse(
      code
        ? new IntegrationError(code, code === "NOT_FOUND" ? 404 : 403)
        : error,
    );
  }
});

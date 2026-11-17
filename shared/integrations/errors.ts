export class IntegrationError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof IntegrationError) {
    return Response.json(
      { error: error.code },
      { status: error.status, headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(
    { error: "INTEGRATION_UNAVAILABLE" },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}

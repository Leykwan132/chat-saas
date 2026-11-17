import { WorkerEntrypoint } from "cloudflare:workers";
import { integrationRequestSchema } from "../../shared/integrations/contracts";
import type {
  IntegrationOperation,
  VerifiedMcpPrincipal,
} from "../../shared/integrations/contracts";
import {
  callIntegrationBackend,
  type BackendEnvironment,
} from "./convexClient";

export class KilobotIntegrationEntrypoint extends WorkerEntrypoint<BackendEnvironment> {
  async execute(
    principal: VerifiedMcpPrincipal,
    operation: IntegrationOperation,
  ) {
    const input = integrationRequestSchema.parse({ principal, operation });
    return callIntegrationBackend(input, this.env);
  }
}

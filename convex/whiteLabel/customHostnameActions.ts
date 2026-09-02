"use node";

import { resolveCname } from "node:dns/promises";
import Cloudflare from "cloudflare";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalAction } from "../_generated/server";
import { getAuthContext } from "../authUtils";
import {
  getCustomHostnameCreateParams,
  getHostnameSnapshot,
  getOwnershipRecord,
  isExpectedPreCutoverError,
  matchesFallbackOrigin,
} from "./customHostnameCloudflare";
import {
  getDelegatedDcvRecord,
  normalizeCustomHostname,
} from "./customHostnameState";

function getRequiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getClient(): Cloudflare {
  return new Cloudflare({
    apiToken: getRequiredEnvironment("CLOUDFLARE_API_TOKEN"),
  });
}

export const createCustomHostname = action({
  args: { hostname: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const access: { partnerId: Id<"whiteLabelPartners"> } = await ctx.runQuery(
      internal.whiteLabel.portalAuthorization.assertPartnerOwner,
      {
        email: auth.email,
        workosUserId: auth.userId,
      },
    );
    const hostname = normalizeCustomHostname(args.hostname);
    const zoneId = getRequiredEnvironment("CLOUDFLARE_ZONE_ID");
    const fallbackOrigin = getRequiredEnvironment("CLOUDFLARE_FALLBACK_ORIGIN");
    const delegationTarget = getRequiredEnvironment(
      "CLOUDFLARE_DCV_DELEGATION_TARGET",
    );
    const domainId = await ctx.runMutation(
      internal.whiteLabel.customHostnameData.reserveDomain,
      { partnerId: access.partnerId, hostname },
    );
    const response = await getClient().customHostnames.create(
      getCustomHostnameCreateParams({ hostname, zoneId }),
    );
    const ownership = getOwnershipRecord(response.ownership_verification);
    if (ownership === null) {
      throw new Error("Cloudflare did not return the ownership DNS record.");
    }
    const delegatedRecord = getDelegatedDcvRecord(hostname, delegationTarget);
    await ctx.runMutation(
      internal.whiteLabel.customHostnameData.persistCreatedHostname,
      {
        domainId,
        partnerId: access.partnerId,
        cloudflareHostnameId: response.id,
        ownershipRecordName: ownership.name,
        ownershipRecordValue: ownership.value,
        delegatedDcvRecordName: delegatedRecord.name,
        delegatedDcvRecordTarget: delegatedRecord.value,
        dnsTarget: fallbackOrigin,
      },
    );
    return null;
  },
});

export const restartCustomHostname = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const access: { partnerId: Id<"whiteLabelPartners"> } = await ctx.runQuery(
      internal.whiteLabel.portalAuthorization.assertPartnerOwner,
      {
        email: auth.email,
        workosUserId: auth.userId,
      },
    );
    const domain = await ctx.runQuery(
      internal.whiteLabel.customHostnameRestartData.getPartnerDomainForRestart,
      { partnerId: access.partnerId },
    );
    if (domain === null) throw new Error("Custom hostname not found.");
    if (domain.cloudflareHostnameId) {
      await getClient().customHostnames.delete(domain.cloudflareHostnameId, {
        zone_id: getRequiredEnvironment("CLOUDFLARE_ZONE_ID"),
      });
    }
    await ctx.runMutation(
      internal.whiteLabel.customHostnameRestartData.removePartnerDomain,
      { partnerId: access.partnerId, domainId: domain.domainId },
    );
    return null;
  },
});

export const pollCustomHostname = internalAction({
  args: { domainId: v.id("whiteLabelPartnerDomains"), generation: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const domain = await ctx.runQuery(
      internal.whiteLabel.customHostnameData.getDomainForPolling,
      { domainId: args.domainId },
    );
    if (
      domain === null ||
      domain.pollGeneration !== args.generation ||
      !domain.setupState?.endsWith("_checking") ||
      !domain.cloudflareHostnameId
    ) {
      return null;
    }
    try {
      const response = await getClient().customHostnames.get(
        domain.cloudflareHostnameId,
        { zone_id: getRequiredEnvironment("CLOUDFLARE_ZONE_ID") },
      );
      const snapshot = getHostnameSnapshot(response);
      const cutoverMatches =
        domain.setupState === "connection_checking"
          ? await resolveCname(domain.hostname)
              .then((targets) =>
                matchesFallbackOrigin(
                  targets,
                  getRequiredEnvironment("CLOUDFLARE_FALLBACK_ORIGIN"),
                ),
              )
              .catch(() => false)
          : false;
      const outcome = await ctx.runMutation(
        internal.whiteLabel.customHostnameData.applyHostnameSnapshot,
        {
          domainId: args.domainId,
          generation: args.generation,
          hostnameStatus: snapshot.hostnameStatus,
          certificateStatus: snapshot.certificateStatus,
          validationError: isExpectedPreCutoverError(snapshot.validationError)
            ? null
            : snapshot.validationError,
          cutoverMatches,
        },
      );
      if (outcome.shouldRetry) {
        await ctx.scheduler.runAfter(
          60_000,
          internal.whiteLabel.customHostnameActions.pollCustomHostname,
          args,
        );
      }
    } catch (error) {
      await ctx.runMutation(
        internal.whiteLabel.customHostnameData.markPollingFailure,
        {
          domainId: args.domainId,
          generation: args.generation,
          error: error instanceof Error ? error.message : "Cloudflare check failed.",
        },
      );
    }
    return null;
  },
});

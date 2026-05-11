import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthContext } from "./authUtils";

// Public action invoked from the post-signup onboarding screen.
//
// Creates a WorkOS Organization (the source of truth) and immediately attaches
// the current user as an `admin` membership, then returns the new
// organization id so the client can call `switchToOrganization` to mint a
// fresh access token whose `org_id` claim points at the new org.
//
// The local Convex `organizations` and `users.members/admins` rows are NOT
// written here — they're populated by `convex/workosWebhook.ts` when WorkOS
// fires the `organization.created` and `organization_membership.created`
// events. That keeps WorkOS as the single source of truth and avoids the
// "primary write succeeded but webhook never arrived" drift class.
export const createOrganizationForCurrentUser = action({
  args: {
    name: v.string(),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ organizationId: string; name: string }> => {
    const { userId } = await getAuthContext(ctx);

    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "WORKOS_API_KEY is not configured. Set it with `bunx convex env set WORKOS_API_KEY <value>`.",
      );
    }

    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Organization name is required");
    }
    if (trimmedName.length > 80) {
      throw new Error("Organization name must be 80 characters or fewer");
    }

    const trimmedDomain = args.domain?.trim().toLowerCase();
    if (trimmedDomain !== undefined && trimmedDomain.length > 0) {
      const isValidDomain = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
        trimmedDomain,
      );
      if (!isValidDomain) {
        throw new Error(
          "Domain looks invalid. Use a hostname like example.com (no protocol or path).",
        );
      }
    }

    const orgBody: Record<string, unknown> = { name: trimmedName };
    if (trimmedDomain && trimmedDomain.length > 0) {
      orgBody.domain_data = [{ domain: trimmedDomain, state: "pending" }];
    }

    const orgRes = await fetch("https://api.workos.com/organizations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orgBody),
    });

    const orgText = await orgRes.text();
    let orgPayload: { id?: string; name?: string; message?: string };
    try {
      orgPayload = orgText.length ? JSON.parse(orgText) : {};
    } catch {
      throw new Error(
        `WorkOS createOrganization returned non-JSON (status ${orgRes.status}): ${orgText.slice(0, 200)}`,
      );
    }
    if (!orgRes.ok || !orgPayload.id) {
      const reason = orgPayload.message ?? `HTTP ${orgRes.status}`;
      throw new Error(`Failed to create WorkOS organization: ${reason}`);
    }
    const organizationId = orgPayload.id;

    const membershipRes = await fetch(
      "https://api.workos.com/user_management/organization_memberships",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          organization_id: organizationId,
          role_slug: "admin",
        }),
      },
    );

    if (!membershipRes.ok) {
      const text = await membershipRes.text();
      let parsed: { message?: string } = {};
      try {
        parsed = text.length ? JSON.parse(text) : {};
      } catch {
        // ignore
      }
      const reason = parsed.message ?? `HTTP ${membershipRes.status}`;
      // The org exists in WorkOS but the user couldn't be attached. Surface
      // the failure so the UI can show an actionable error; the org will
      // appear in the admin's WorkOS dashboard and can be cleaned up there.
      throw new Error(`Created organization but failed to add you as admin: ${reason}`);
    }

    return { organizationId, name: orgPayload.name ?? trimmedName };
  },
});

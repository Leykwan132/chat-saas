# Partner Custom Hostnames

## Purpose

Let an approved partner connect one CNAME-compatible customer subdomain to its branded Kilobot portal without TLS downtime. The partner completes each external DNS change in a gated wizard, while the backend creates and monitors the Cloudflare Custom Hostname.

## Scope

- Support one custom subdomain per partner.
- Use Cloudflare Custom Hostnames through the installed Cloudflare Node client.
- Request a DV certificate with DNS TXT validation when creating the custom hostname.
- Use delegated DCV and zero-downtime DNS cutover.
- Keep the existing Branding tab, logo upload, and visual language intact.

The feature excludes apex domains, automatic customer DNS writes, multiple partner domains, and WorkOS custom-auth configuration.

## Deployment configuration

All configuration is stored in Convex deployment environment variables and is never returned to the browser.

- `CLOUDFLARE_API_TOKEN`: token scoped to the SaaS zone with `SSL and Certificates: Write`.
- `CLOUDFLARE_ZONE_ID`: the supplied SaaS zone ID.
- `CLOUDFLARE_FALLBACK_ORIGIN`: `kilobot.app`.
- `CLOUDFLARE_DCV_DELEGATION_TARGET`: `a6627bf9414e7423.dcv.cloudflare.com`.

`kilobot.app` must already be configured as the Cloudflare Custom Hostnames fallback origin. The backend uses the fallback-origin variable for the final CNAME instruction and to validate cutover.

## Partner experience

Branding replaces the editable domain field with a custom-domain summary and a `Set up custom domain` button. The button opens a shadcn Dialog with a vertical list of six steps. Incomplete future steps use muted text and controls. A step becomes available only after its preceding check succeeds.

1. **Choose domain**
   - The partner enters a valid subdomain such as `app.partner.com`.
   - `Create hostname` creates the Cloudflare custom hostname with `ssl.method: "txt"` and `ssl.type: "dv"`.
   - The backend stores the Cloudflare hostname ID and retrieves its details after Cloudflare makes validation records available.

2. **Verify ownership**
   - The dialog shows the Cloudflare-provided ownership prevalidation record and copy controls.
   - The partner clicks `I've added this record` after updating authoritative DNS.
   - That click starts server-side ownership polling. It does not unlock the next step until Cloudflare confirms ownership.

3. **Delegate certificate validation**
   - The dialog shows a permanent CNAME:

     ```txt
     _acme-challenge.<custom-hostname> CNAME <custom-hostname>.a6627bf9414e7423.dcv.cloudflare.com
     ```

   - It explains that an existing `_acme-challenge` TXT record conflicts with this CNAME and that the CNAME remains for renewals.
   - The partner clicks `I've added this record` only after making the DNS change.

4. **Wait for TLS readiness**
   - The confirmation in step 3 starts server-side polling of the Cloudflare custom hostname.
   - Polling stops successfully only when both `status` and `ssl.status` are `active`.
   - The UI presents the latest provider status while waiting. A provider failure pauses polling and offers an explicit retry.

5. **Cut over traffic**
   - Only after TLS readiness does the dialog show the final record:

     ```txt
     <custom-hostname> CNAME kilobot.app
     ```

   - The partner clicks `I've updated DNS` after changing DNS. No automated DNS mutation is performed.

6. **Connect and preview**
   - The confirmation in step 5 starts server-side DNS verification and a final Cloudflare status refresh.
   - The domain becomes `connected` only after the final CNAME resolves to the configured fallback target and Cloudflare still reports both hostname and TLS as active.
   - Branding then shows the connected hostname and a copyable `https://<custom-hostname>` preview link.

Closing and reopening the Dialog preserves all progress and current provider state.

## Backend architecture

The Cloudflare client is isolated in a Node-only action module. It reads only `CLOUDFLARE_*` environment variables and calls `client.customHostnames.create`, `get`, and any necessary validation update. The module contains actions only and accesses Convex data through internal queries and mutations.

Internal domain functions own persistence, partner authorization checks, state transitions, and scheduling. Public functions expose only the current partner's sanitized domain setup state and invoke start or retry actions. No Cloudflare token, provider response beyond setup instructions, or internal error detail is sent to another partner.

Scheduled checks run only after the corresponding customer confirmation. Each scheduled check re-fetches provider state, persists the result, and either schedules a bounded next check, advances the state, or records a recoverable failure. Polling never starts merely from rendering the Dialog.

## Data model

`whiteLabelPartnerDomains` remains the source of truth and evolves migration-safely using optional fields. Existing high-level `status` remains compatible with current consumers. New optional setup fields record:

- the Cloudflare custom hostname ID;
- setup state and last-check timestamp;
- ownership verification record name, type, and value when Cloudflare supplies them;
- delegated DCV record name and computed target;
- provider hostname status and certificate status;
- the latest safe validation error;
- confirmation and verification timestamps for each customer-managed DNS stage.

The setup state is explicit: `draft`, `ownership_pending`, `ownership_checking`, `dcv_pending`, `certificate_checking`, `cutover_pending`, `connection_checking`, `connected`, or `failed`. State changes are validated server-side rather than inferred from a client click.

## Errors and recovery

- Invalid, apex, duplicate, or zone-matching hostnames are rejected before the provider call.
- Cloudflare creation errors leave no connected state and show a retryable message.
- Missing ownership, delegated DCV, certificate, or cutover DNS records retain their current step with clear instructions and a retry action.
- A scheduled check stops after a bounded retry window. The partner can restart it with the existing Done or retry control after fixing DNS.
- Replacing an existing domain is not part of v1; a connected domain is read-only until a dedicated replacement flow is designed.

## Security and authorization

Every public query, mutation, and action verifies the current user's active partner access. Internal functions verify the partner ID associated with the domain before persisting changes. The API token stays in Convex action runtime environment only. The browser receives only records the partner must create, status labels, and the connected preview URL.

## Testing

- Unit-test hostname validation, delegated-target construction, state transitions, and retry limits.
- Convex-test authorization and persistence paths for creation, customer confirmations, status advancement, and failure recovery.
- Mock the Cloudflare client at the action boundary to cover delayed validation records, active TLS, and provider errors.
- Add UI tests for step gating, copyable records, confirmation-triggered polling, connected-only preview visibility, and persistence after reopening the Dialog.
- Run focused tests, full TypeScript validation, formatting/diff checks, and a Convex deployment before release.

## References

- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/zero-downtime-migration/
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/create-custom-hostnames/
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/delegated-dcv/

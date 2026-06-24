import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { workosWebhook } from "./workosWebhook";
import {
  receive as whatsappReceive,
  verify as metaVerify,
} from "./whatsappWebhook";
import { receive as instagramReceive } from "./instagramWebhook";
import { receive as messengerReceive } from "./messengerWebhook";
import { authKit } from "./auth";
import { decodeOAuthState, redirectResponse } from "./oauthShared";
import {
  generateConfirmationCode,
  parseAndVerifySignedRequest,
} from "./signedRequest";

const http = httpRouter();
authKit.registerRoutes(http);

import { components } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import {
  EXTRA_CREDITS_PACK_AMOUNT,
  STRIPE_CREDITS_AMOUNT_METADATA_KEY,
  STRIPE_EXTRA_CREDITS_METADATA_TYPE,
} from "../shared/planCatalog";

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "customer.subscription.created": async (ctx, event: any) => {
      const subscription = event.data.object;
      console.log("Subscription created:", subscription.id, subscription.status);
      const orgId = subscription.metadata?.orgId;
      if (orgId) {
        const item = subscription.items?.data?.[0];
        await ctx.runMutation(internal.stripe.handleSubscriptionUpdatedInternal, {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          status: subscription.status,
          priceId: item?.price?.id || "",
          currentPeriodEnd: item?.current_period_end || 0,
          orgId,
        });
      }
    },
    "customer.subscription.updated": async (ctx, event: any) => {
      const subscription = event.data.object;
      console.log("Subscription updated:", subscription.id, subscription.status);
      const orgId = subscription.metadata?.orgId;
      if (orgId) {
        const item = subscription.items?.data?.[0];
        await ctx.runMutation(internal.stripe.handleSubscriptionUpdatedInternal, {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          status: subscription.status,
          priceId: item?.price?.id || "",
          currentPeriodEnd: item?.current_period_end || 0,
          orgId,
        });
      }
    },
    "customer.subscription.deleted": async (ctx, event: any) => {
      const subscription = event.data.object;
      const orgId = subscription.metadata?.orgId;
      if (orgId) {
        await ctx.runMutation(internal.stripe.handleSubscriptionDeletedInternal, {
          stripeSubscriptionId: subscription.id,
          orgId,
        });
      }
    },
    "checkout.session.completed": async (_ctx, event: any) => {
      const session = event.data.object;
      if (session.mode === "payment" && session.metadata?.type === STRIPE_EXTRA_CREDITS_METADATA_TYPE) {
        // Credits are granted from payment_intent.succeeded after verification.
        return;
      }
    },
    "payment_intent.succeeded": async (ctx, event: any) => {
      const paymentIntent = event.data.object;
      if (paymentIntent.status !== "succeeded") {
        return;
      }

      const storedPayment = await ctx.runQuery(components.stripe.public.getPayment, {
        stripePaymentIntentId: paymentIntent.id,
      });
      if (!storedPayment || storedPayment.status !== "succeeded") {
        console.warn(
          "payment_intent.succeeded without stored succeeded payment:",
          paymentIntent.id,
        );
        return;
      }

      const metadata = {
        ...(storedPayment.metadata ?? {}),
        ...(paymentIntent.metadata ?? {}),
      };
      if (metadata.type !== STRIPE_EXTRA_CREDITS_METADATA_TYPE) {
        return;
      }

      const creditsRaw =
        metadata[STRIPE_CREDITS_AMOUNT_METADATA_KEY] ?? metadata.creditsAmount;
      const creditsToGrant = Number.parseInt(
        String(creditsRaw ?? EXTRA_CREDITS_PACK_AMOUNT),
        10,
      );
      if (!Number.isFinite(creditsToGrant) || creditsToGrant <= 0) {
        console.warn("Invalid credits metadata for payment intent:", paymentIntent.id);
        return;
      }

      const stripeCustomerId =
        (typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : undefined) ?? storedPayment.stripeCustomerId;
      if (!stripeCustomerId) {
        console.warn("payment_intent.succeeded missing customer:", paymentIntent.id);
        return;
      }

      const customer = await ctx.runQuery(components.stripe.public.getCustomer, {
        stripeCustomerId,
      });
      if (!customer?.userId) {
        console.warn("payment_intent.succeeded customer not mapped:", stripeCustomerId);
        return;
      }

      const orgId = (metadata.orgId as string | undefined) ?? customer.userId;

      await ctx.runMutation(internal.stripe.handlePaymentIntentSucceededInternal, {
        stripePaymentIntentId: paymentIntent.id,
        orgId,
        creditsToGrant,
      });
    },
  },
});

http.route({
  path: "/webhook/workos",
  method: "POST",
  handler: workosWebhook,
});

const whatsappDispatch = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  // const sig = await verifyMetaSignature(req, rawBody);
  // if (!sig.ok) {
  //   return new Response(sig.message, { status: sig.status });
  // }

  console.log("whatsappDispatch", rawBody);

  let object: string | undefined;
  try {
    const peek = JSON.parse(rawBody) as { object?: string };
    object = peek.object;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  console.log("whatsappDispatch object", object);

  if (object === 'whatsapp_business_account') {
    console.log("whatsappDispatch whatsapp_business_account");
    return await whatsappReceive(ctx, rawBody);
  }
  console.log("whatsappDispatch default");

  return new Response(null, { status: 200 });
});

http.route({
  path: "/webhook/whatsapp",
  method: "GET",
  handler: metaVerify,
});

http.route({
  path: "/webhook/whatsapp",
  method: "POST",
  handler: whatsappDispatch,
});

const instagramDispatch = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  // const sig = await verifyMetaSignature(
  //   req,
  //   rawBody,
  //   process.env.INSTAGRAM_APP_SECRET
  // );
  // if (!sig.ok) {
  //   return new Response(sig.message, { status: sig.status as number });
  // }

  let object: string | undefined;
  try {
    const peek = JSON.parse(rawBody) as { object?: string };
    object = peek.object;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (object === "instagram") {
    return await instagramReceive(ctx, rawBody);
  }
  return new Response(null, { status: 200 });
});

http.route({
  path: "/webhook/instagram",
  method: "GET",
  handler: metaVerify,
});

http.route({
  path: "/webhook/instagram",
  method: "POST",
  handler: instagramDispatch,
});

const messengerDispatch = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  // const sig = await verifyMetaSignature(req, rawBody);
  // if (!sig.ok) {
  //   return new Response(sig.message, { status: sig.status });
  // }

  let object: string | undefined;
  try {
    const peek = JSON.parse(rawBody) as { object?: string };
    object = peek.object;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (object === "page") {
    console.log("[messenger-webhook] dispatch", {
      route: "/webhook/messenger",
      object,
      bodyBytes: rawBody.length,
    });
    return await messengerReceive(ctx, rawBody);
  }
  console.log("[messenger-webhook] dispatch:ignored", { object });
  return new Response(null, { status: 200 });
});

http.route({
  path: "/webhook/messenger",
  method: "GET",
  handler: metaVerify,
});

http.route({
  path: "/webhook/messenger",
  method: "POST",
  handler: messengerDispatch,
});

// ────────────────────────────────────────────────────────────────────────
// Static OAuth callback for Instagram.
//
// Instagram's OAuth flow does NOT use a popup (no FB.login equivalent we
// can call), so we use a full-page redirect into this static endpoint and
// ferry the per-flow destination inside the `state` parameter (set in
// instagramAuth.start).
//
// Shape:
//   1. Decode `state` -> { csrf, returnPath }
//   2. Look up oauthSessions row by csrf (must exist, not be expired, not be
//      consumed, and have service === "instagram")
//   3. Hand off to internalCompleteSignup with the session's orgId/userId —
//      i.e. the same identity that started the flow
//   4. Mark the session consumed (replay defense)
//   5. 302 -> `${APP_BASE_URL}${returnPath}?instagram=connected`
//
// Any failure short-circuits to the same returnPath with `?instagram=error`
// so the ChannelsPage can render a friendly toast.
//
// Messenger uses classic `dialog/oauth` → /auth/messenger/callback (see
// messengerAuth.start + messengerOAuthCallback).
// WhatsApp Embedded Signup → /auth/whatsapp/callback (see whatsAppOAuthCallback).
// ────────────────────────────────────────────────────────────────────────

const FALLBACK_RETURN_PATH = "/workspace";

// Resolves { code, csrf, returnPath, oauthError } from a callback URL.
// Lives here so both callbacks parse the inbound URL identically.
function parseCallbackUrl(req: Request): {
  code: string | null;
  csrf: string | null;
  returnPath: string;
  oauthError: string | null;
  oauthErrorReason: string | null;
} {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const oauthErrorReason =
    url.searchParams.get("error_description") ??
    url.searchParams.get("error_reason");

  const decoded = decodeOAuthState(stateRaw);
  return {
    code,
    csrf: decoded?.csrf ?? null,
    returnPath: decoded?.returnPath ?? FALLBACK_RETURN_PATH,
    oauthError,
    oauthErrorReason,
  };
}

const instagramCallback = httpAction(async (ctx, req) => {
  const { code, csrf, returnPath, oauthError, oauthErrorReason } =
    parseCallbackUrl(req);

  if (oauthError) {
    return redirectResponse(returnPath, {
      instagram: "error",
      message: oauthErrorReason ?? oauthError,
    });
  }

  if (!code || !csrf) {
    return redirectResponse(returnPath, {
      instagram: "error",
      message: "Missing code or state from Instagram callback",
    });
  }

  const session = await ctx.runQuery(
    internal.oauthSessions.internalGetByCsrf,
    { csrf },
  );
  if (
    session === null ||
    session.service !== "instagram" ||
    session.consumed ||
    session.expiresAt < Date.now()
  ) {
    return redirectResponse(returnPath, {
      instagram: "error",
      message: "OAuth session expired or already used. Please try again.",
    });
  }

  // Re-derive the static redirect URI used when starting the flow — Meta
  // requires that the redirect_uri passed to the token-exchange step match
  // the one the authorize URL used.
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    return redirectResponse(session.returnPath, {
      instagram: "error",
      message: "CONVEX_SITE_URL is not configured",
    });
  }
  const redirectUri = `${siteUrl}/auth/instagram/callback`;

  try {
    await ctx.runAction(internal.instagramConnect.internalCompleteSignup, {
      code,
      redirectUri,
      orgId: session.orgId,
      userId: session.userId,
    });
    await ctx.runMutation(internal.oauthSessions.internalMarkConsumed, {
      csrf,
    });
    return redirectResponse(session.returnPath, { instagram: "connected" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return redirectResponse(session.returnPath, {
      instagram: "error",
      message,
    });
  }
});

http.route({
  path: "/auth/instagram/callback",
  method: "GET",
  handler: instagramCallback,
});

// Classic Facebook OAuth for Messenger (`dialog/oauth` with scopes
// `pages_messaging,pages_show_list`). The `redirect_uri` here MUST match
// `messengerAuth.start` and `exchangeCodeForUserToken` exactly:
// `${CONVEX_SITE_URL}/auth/messenger/callback` (trim trailing slash on site).
const messengerOAuthCallback = httpAction(async (ctx, req) => {
  const { code, csrf, returnPath, oauthError, oauthErrorReason } =
    parseCallbackUrl(req);

  if (oauthError) {
    return redirectResponse(returnPath, {
      messenger: "error",
      message: oauthErrorReason ?? oauthError,
    });
  }

  if (!code || !csrf) {
    return redirectResponse(returnPath, {
      messenger: "error",
      message: "Missing code or state from Messenger OAuth callback",
    });
  }

  const session = await ctx.runQuery(
    internal.oauthSessions.internalGetByCsrf,
    { csrf },
  );
  if (
    session === null ||
    session.service !== "messenger" ||
    session.consumed ||
    session.expiresAt < Date.now()
  ) {
    return redirectResponse(returnPath, {
      messenger: "error",
      message: "OAuth session expired or already used. Please try again.",
    });
  }

  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    return redirectResponse(session.returnPath, {
      messenger: "error",
      message: "CONVEX_SITE_URL is not configured",
    });
  }
  const redirectUri = `${siteUrl.replace(/\/+$/, "")}/auth/messenger/callback`;

  try {
    const result = await ctx.runAction(
      internal.messengerConnect.internalOAuthCallback,
      {
        code,
        redirectUri,
        orgId: session.orgId,
        userId: session.userId,
      },
    );

    if (result.kind === "needsPicker") {
      await ctx.runMutation(
        internal.oauthSessions.internalSetPendingUserToken,
        {
          sessionId: session._id,
          userAccessToken: result.userAccessToken,
        },
      );
      return redirectResponse(session.returnPath, {
        messenger: "pick",
        session: session._id,
      });
    }

    await ctx.runMutation(internal.oauthSessions.internalMarkConsumed, {
      csrf,
    });
    return redirectResponse(session.returnPath, { messenger: "connected" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return redirectResponse(session.returnPath, {
      messenger: "error",
      message,
    });
  }
});

http.route({
  path: "/auth/messenger/callback",
  method: "GET",
  handler: messengerOAuthCallback,
});

// WhatsApp Embedded Signup OAuth redirect. Meta may send the browser here
// instead of (or in addition to) postMessage when the hosted flow finishes.
// WABA / phone ids still come from the open connection attempt or postMessage;
// we ferry the auth `code` back to the SPA to finish completeSignup.
const whatsAppOAuthCallback = httpAction(async (_ctx, req) => {
  const { code, returnPath, oauthError, oauthErrorReason } = parseCallbackUrl(req);

  console.log('whatsAppOAuthCallback', { code, returnPath, oauthError, oauthErrorReason });
  if (oauthError) {
    return redirectResponse(returnPath, {
      whatsapp: "error",
      message: oauthErrorReason ?? oauthError,
    });
  }

  if (!code) {
    return redirectResponse(returnPath, {
      whatsapp: "error",
      message: "Missing authorization code from WhatsApp callback",
    });
  }

  return redirectResponse(returnPath, {
    whatsapp: "redirect",
    code,
  });
});

http.route({
  path: "/auth/whatsapp/callback",
  method: "GET",
  handler: whatsAppOAuthCallback,
});

// ────────────────────────────────────────────────────────────────────────
// Deauthorize + Data Deletion webhooks (Instagram + Messenger).
//
// Meta calls these when:
//   - a user removes our app from their Instagram/Facebook account
//     (Deauthorize Callback URL)
//   - a user requests deletion of the data we hold on them
//     (Data Deletion Request URL)
//
// Both arrive as `POST application/x-www-form-urlencoded` with a
// `signed_request` field. We verify HMAC with the appropriate app secret,
// extract `user_id`, and disconnect every channel row tied to that user.
// Per product decision, we DO NOT cascade-delete conversations/messages —
// only the channel link is severed and the access token cleared so we
// can never call Graph on that user's behalf again.
//
// Data-deletion endpoints additionally respond with the JSON contract Meta
// expects: { url, confirmation_code }. The `url` points at a status page in
// the SPA where users can confirm their deletion was actioned.
// ────────────────────────────────────────────────────────────────────────

async function readSignedRequest(req: Request): Promise<string | null> {
  // Meta posts form-encoded by default; tolerate JSON for local testing.
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as { signed_request?: unknown };
      return typeof body.signed_request === "string"
        ? body.signed_request
        : null;
    } catch {
      return null;
    }
  }
  const text = await req.text();
  const form = new URLSearchParams(text);
  return form.get("signed_request");
}

type Service = "instagram" | "messenger";

function appSecretFor(service: Service): string | null {
  return service === "instagram"
    ? (process.env.INSTAGRAM_APP_SECRET ?? null)
    : (process.env.META_APP_SECRET ?? null);
}

// Verifies signed_request and resolves the user_id. Returns null when the
// signature is bad, the payload is malformed, or the relevant app secret
// is missing — callers should respond 400 in that case.
async function authenticateSignedRequest(
  req: Request,
  service: Service,
): Promise<{ userId: string } | null> {
  const signedRequest = await readSignedRequest(req);
  if (!signedRequest) return null;
  const secret = appSecretFor(service);
  if (!secret) return null;
  const payload = await parseAndVerifySignedRequest(signedRequest, secret);
  if (payload === null || typeof payload.user_id !== "string") return null;
  return { userId: payload.user_id };
}

async function runDisconnect(
  ctx: ActionCtx,
  service: Service,
  userId: string,
) {
  if (service === "instagram") {
    await ctx.runMutation(internal.channels.internalDisconnectByIgUserId, {
      igUserId: userId,
    });
  } else {
    await ctx.runMutation(internal.channels.internalDisconnectByFbUserId, {
      fbUserId: userId,
    });
  }
}

function dataDeletionResponse(confirmationCode: string): Response {
  // The status URL Meta presents to the user as proof we received the
  // request. APP_BASE_URL is required so we can hand back an absolute URL.
  let statusUrl = `https://example.com/privacy/deletion?code=${confirmationCode}`;
  try {
    const base = process.env.APP_BASE_URL?.replace(/\/+$/, "");
    if (base) {
      statusUrl = `${base}/privacy/deletion?code=${confirmationCode}`;
    }
  } catch {
    // Keep the fallback URL.
  }
  return new Response(
    JSON.stringify({ url: statusUrl, confirmation_code: confirmationCode }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function buildDeauthorizeHandler(service: Service) {
  return httpAction(async (ctx, req) => {
    const auth = await authenticateSignedRequest(req, service);
    if (!auth) {
      return new Response("invalid signed_request", { status: 400 });
    }
    await runDisconnect(ctx, service, auth.userId);
    return new Response(null, { status: 200 });
  });
}

function buildDataDeletionHandler(service: Service) {
  return httpAction(async (ctx, req) => {
    const auth = await authenticateSignedRequest(req, service);
    if (!auth) {
      return new Response("invalid signed_request", { status: 400 });
    }
    await runDisconnect(ctx, service, auth.userId);
    return dataDeletionResponse(generateConfirmationCode());
  });
}

http.route({
  path: "/auth/instagram/deauthorize",
  method: "POST",
  handler: buildDeauthorizeHandler("instagram"),
});

http.route({
  path: "/auth/instagram/data-deletion",
  method: "POST",
  handler: buildDataDeletionHandler("instagram"),
});

http.route({
  path: "/auth/messenger/deauthorize",
  method: "POST",
  handler: buildDeauthorizeHandler("messenger"),
});

http.route({
  path: "/auth/messenger/data-deletion",
  method: "POST",
  handler: buildDataDeletionHandler("messenger"),
});

export default http;

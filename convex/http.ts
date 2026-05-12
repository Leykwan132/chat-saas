import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { workosWebhook } from "./workosWebhook";
import {
  receive as whatsappReceive,
  verify as metaVerify,
} from "./whatsappWebhook";
import { receive as instagramReceive } from "./instagramWebhook";
import { receive as messengerReceive } from "./messengerWebhook";
import { verifyMetaSignature } from "./metaWebhookShared";
import { authKit } from "./auth";

const http = httpRouter();
authKit.registerRoutes(http);

http.route({
  path: "/webhook/workos",
  method: "POST",
  handler: workosWebhook,
});

// Meta webhooks (WhatsApp, Instagram, Messenger) — single endpoint
//   https://<convex-site>/webhook/meta
// configured against each product in the Meta App Dashboard. We verify the
// shared HMAC once here, then dispatch based on the top-level `object`
// discriminator.
http.route({
  path: "/webhook/meta",
  method: "GET",
  handler: metaVerify,
});

const metaDispatch = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  const sig = await verifyMetaSignature(req, rawBody);
  if (!sig.ok) {
    return new Response(sig.message, { status: sig.status });
  }

  let object: string | undefined;
  try {
    const peek = JSON.parse(rawBody) as { object?: string };
    object = peek.object;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  switch (object) {
    case "whatsapp_business_account":
      return await whatsappReceive(ctx, rawBody);
    case "instagram":
      return await instagramReceive(ctx, rawBody);
    case "page":
      return await messengerReceive(ctx, rawBody);
    default:
      // Webhook subscribed for a product we don't currently model (or a
      // probe). Always ack so Meta does not keep retrying.
      return new Response(null, { status: 200 });
  }
});

http.route({
  path: "/webhook/meta",
  method: "POST",
  handler: metaDispatch,
});

export default http;

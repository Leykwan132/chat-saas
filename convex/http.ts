import { httpRouter } from "convex/server";
import { workosWebhook } from "./workosWebhook";
import { receive as metaReceive, verify as metaVerify } from "./whatsappWebhook";
import { authKit } from "./auth";

const http = httpRouter();
authKit.registerRoutes(http);

http.route({
  path: "/webhook/workos",
  method: "POST",
  handler: workosWebhook,
});

// Meta WhatsApp Business webhooks. Configure the URL
//   https://outstanding-rabbit-215.convex.site/webhook/meta
// in the Meta App Dashboard, with verify token = META_APP_VERIFY_TOKEN, and
// subscribe to the `messages` field on the WhatsApp product.
http.route({
  path: "/webhook/meta",
  method: "GET",
  handler: metaVerify,
});
http.route({
  path: "/webhook/meta",
  method: "POST",
  handler: metaReceive,
});

export default http;

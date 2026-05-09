import { httpRouter } from "convex/server";
import { workosWebhook } from "./workosWebhook";
import { authKit } from "./auth";

const http = httpRouter();
authKit.registerRoutes(http);

http.route({
  path: "/webhook/workos",
  method: "POST",
  handler: workosWebhook,
});

export default http;

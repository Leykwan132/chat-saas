/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentRuntime from "../agentRuntime.js";
import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as authUtils from "../authUtils.js";
import type * as chat_streaming from "../chat/streaming.js";
import type * as cloudflare from "../cloudflare.js";
import type * as devReset from "../devReset.js";
import type * as http from "../http.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as messages from "../messages.js";
import type * as organizations from "../organizations.js";
import type * as users from "../users.js";
import type * as workosWebhook from "../workosWebhook.js";
import type * as workpool from "../workpool.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentRuntime: typeof agentRuntime;
  agents: typeof agents;
  auth: typeof auth;
  authUtils: typeof authUtils;
  "chat/streaming": typeof chat_streaming;
  cloudflare: typeof cloudflare;
  devReset: typeof devReset;
  http: typeof http;
  knowledgeBase: typeof knowledgeBase;
  messages: typeof messages;
  organizations: typeof organizations;
  users: typeof users;
  workosWebhook: typeof workosWebhook;
  workpool: typeof workpool;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  cfUploadWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"cfUploadWorkpool">;
  cfDeleteWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"cfDeleteWorkpool">;
  webScraperWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"webScraperWorkpool">;
  linkDiscovererWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"linkDiscovererWorkpool">;
  workOSAuthKit: import("@convex-dev/workos-authkit/_generated/component.js").ComponentApi<"workOSAuthKit">;
};

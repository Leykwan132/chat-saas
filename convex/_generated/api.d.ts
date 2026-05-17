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
import type * as channelSyncPools from "../channelSyncPools.js";
import type * as channels from "../channels.js";
import type * as chat_channelSend from "../chat/channelSend.js";
import type * as chat_inbox from "../chat/inbox.js";
import type * as chat_inboxActions from "../chat/inboxActions.js";
import type * as chat_inboxMessageMapping from "../chat/inboxMessageMapping.js";
import type * as chat_streaming from "../chat/streaming.js";
import type * as chat_threads from "../chat/threads.js";
import type * as cloudflare from "../cloudflare.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as devReset from "../devReset.js";
import type * as http from "../http.js";
import type * as inboxPools from "../inboxPools.js";
import type * as instagramAuth from "../instagramAuth.js";
import type * as instagramConnect from "../instagramConnect.js";
import type * as instagramSend from "../instagramSend.js";
import type * as instagramSync from "../instagramSync.js";
import type * as instagramWebhook from "../instagramWebhook.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as messages from "../messages.js";
import type * as messengerAuth from "../messengerAuth.js";
import type * as messengerConnect from "../messengerConnect.js";
import type * as messengerSend from "../messengerSend.js";
import type * as messengerSync from "../messengerSync.js";
import type * as messengerWebhook from "../messengerWebhook.js";
import type * as metaWebhookShared from "../metaWebhookShared.js";
import type * as oauthSessions from "../oauthSessions.js";
import type * as oauthShared from "../oauthShared.js";
import type * as organizations from "../organizations.js";
import type * as organizationsAdmin from "../organizationsAdmin.js";
import type * as signedRequest from "../signedRequest.js";
import type * as users from "../users.js";
import type * as whatsappBroadcast from "../whatsappBroadcast.js";
import type * as whatsappDemo from "../whatsappDemo.js";
import type * as whatsappEmbeddedSignup from "../whatsappEmbeddedSignup.js";
import type * as whatsappSend from "../whatsappSend.js";
import type * as whatsappWebhook from "../whatsappWebhook.js";
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
  channelSyncPools: typeof channelSyncPools;
  channels: typeof channels;
  "chat/channelSend": typeof chat_channelSend;
  "chat/inbox": typeof chat_inbox;
  "chat/inboxActions": typeof chat_inboxActions;
  "chat/inboxMessageMapping": typeof chat_inboxMessageMapping;
  "chat/streaming": typeof chat_streaming;
  "chat/threads": typeof chat_threads;
  cloudflare: typeof cloudflare;
  conversations: typeof conversations;
  crons: typeof crons;
  customers: typeof customers;
  devReset: typeof devReset;
  http: typeof http;
  inboxPools: typeof inboxPools;
  instagramAuth: typeof instagramAuth;
  instagramConnect: typeof instagramConnect;
  instagramSend: typeof instagramSend;
  instagramSync: typeof instagramSync;
  instagramWebhook: typeof instagramWebhook;
  knowledgeBase: typeof knowledgeBase;
  messages: typeof messages;
  messengerAuth: typeof messengerAuth;
  messengerConnect: typeof messengerConnect;
  messengerSend: typeof messengerSend;
  messengerSync: typeof messengerSync;
  messengerWebhook: typeof messengerWebhook;
  metaWebhookShared: typeof metaWebhookShared;
  oauthSessions: typeof oauthSessions;
  oauthShared: typeof oauthShared;
  organizations: typeof organizations;
  organizationsAdmin: typeof organizationsAdmin;
  signedRequest: typeof signedRequest;
  users: typeof users;
  whatsappBroadcast: typeof whatsappBroadcast;
  whatsappDemo: typeof whatsappDemo;
  whatsappEmbeddedSignup: typeof whatsappEmbeddedSignup;
  whatsappSend: typeof whatsappSend;
  whatsappWebhook: typeof whatsappWebhook;
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
  instagramSyncWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"instagramSyncWorkpool">;
  messengerSyncWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"messengerSyncWorkpool">;
  inboxAiReplyWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"inboxAiReplyWorkpool">;
  workOSAuthKit: import("@convex-dev/workos-authkit/_generated/component.js").ComponentApi<"workOSAuthKit">;
  crons: import("@convex-dev/crons/_generated/component.js").ComponentApi<"crons">;
};

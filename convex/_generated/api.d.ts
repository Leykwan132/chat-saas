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
import type * as agentUsage from "../agentUsage.js";
import type * as agents from "../agents.js";
import type * as aggregates from "../aggregates.js";
import type * as auth from "../auth.js";
import type * as authUtils from "../authUtils.js";
import type * as billingScope from "../billingScope.js";
import type * as broadcastPool from "../broadcastPool.js";
import type * as calendarEvents from "../calendarEvents.js";
import type * as channelSyncPools from "../channelSyncPools.js";
import type * as channels from "../channels.js";
import type * as chat_audioUtils from "../chat/audioUtils.js";
import type * as chat_channelSend from "../chat/channelSend.js";
import type * as chat_inbox from "../chat/inbox.js";
import type * as chat_inboxActions from "../chat/inboxActions.js";
import type * as chat_inboxAudioIngest from "../chat/inboxAudioIngest.js";
import type * as chat_inboxMessageMapping from "../chat/inboxMessageMapping.js";
import type * as chat_mediaUrlExtractor from "../chat/mediaUrlExtractor.js";
import type * as chat_streaming from "../chat/streaming.js";
import type * as chat_threads from "../chat/threads.js";
import type * as cloudflare from "../cloudflare.js";
import type * as conversations from "../conversations.js";
import type * as creditBalance from "../creditBalance.js";
import type * as creditEntries from "../creditEntries.js";
import type * as creditLogs from "../creditLogs.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as debugTemplates from "../debugTemplates.js";
import type * as devReset from "../devReset.js";
import type * as followUpPool from "../followUpPool.js";
import type * as followUpQueries from "../followUpQueries.js";
import type * as http from "../http.js";
import type * as inboxPools from "../inboxPools.js";
import type * as instagramAuth from "../instagramAuth.js";
import type * as instagramConnect from "../instagramConnect.js";
import type * as instagramSend from "../instagramSend.js";
import type * as instagramSync from "../instagramSync.js";
import type * as instagramWebhook from "../instagramWebhook.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as knowledgeBaseImages from "../knowledgeBaseImages.js";
import type * as leadRouting_assign from "../leadRouting/assign.js";
import type * as leadRouting_eligibility from "../leadRouting/eligibility.js";
import type * as leadRouting_helpers from "../leadRouting/helpers.js";
import type * as leadRouting_provision from "../leadRouting/provision.js";
import type * as leadRouting_schedules from "../leadRouting/schedules.js";
import type * as leadRouting_settings from "../leadRouting/settings.js";
import type * as llm_modelPricing from "../llm/modelPricing.js";
import type * as llm_openRouter from "../llm/openRouter.js";
import type * as media_attachments from "../media/attachments.js";
import type * as media_r2 from "../media/r2.js";
import type * as media_r2Client from "../media/r2Client.js";
import type * as mediaPools from "../mediaPools.js";
import type * as messages from "../messages.js";
import type * as messengerAuth from "../messengerAuth.js";
import type * as messengerConnect from "../messengerConnect.js";
import type * as messengerSend from "../messengerSend.js";
import type * as messengerSync from "../messengerSync.js";
import type * as messengerWebhook from "../messengerWebhook.js";
import type * as metaWebhookShared from "../metaWebhookShared.js";
import type * as oauthSessions from "../oauthSessions.js";
import type * as oauthShared from "../oauthShared.js";
import type * as orgRoles from "../orgRoles.js";
import type * as organizations from "../organizations.js";
import type * as organizationsAdmin from "../organizationsAdmin.js";
import type * as planCatalog from "../planCatalog.js";
import type * as planStripe from "../planStripe.js";
import type * as plans from "../plans.js";
import type * as quickReplies from "../quickReplies.js";
import type * as signedRequest from "../signedRequest.js";
import type * as stripe from "../stripe.js";
import type * as teamAccess from "../teamAccess.js";
import type * as teamHelpers from "../teamHelpers.js";
import type * as teamInvitationRecords from "../teamInvitationRecords.js";
import type * as teamInvitations from "../teamInvitations.js";
import type * as teamMembers from "../teamMembers.js";
import type * as teamRoles from "../teamRoles.js";
import type * as teams from "../teams.js";
import type * as triggers from "../triggers.js";
import type * as usageMonthKey from "../usageMonthKey.js";
import type * as users from "../users.js";
import type * as whatsappBroadcast from "../whatsappBroadcast.js";
import type * as whatsappDemo from "../whatsappDemo.js";
import type * as whatsappEmbeddedSignup from "../whatsappEmbeddedSignup.js";
import type * as whatsappFollowUp from "../whatsappFollowUp.js";
import type * as whatsappSend from "../whatsappSend.js";
import type * as whatsappWebhook from "../whatsappWebhook.js";
import type * as workosClient from "../workosClient.js";
import type * as workosOrganizationActions from "../workosOrganizationActions.js";
import type * as workosWebhook from "../workosWebhook.js";
import type * as workpool from "../workpool.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentRuntime: typeof agentRuntime;
  agentUsage: typeof agentUsage;
  agents: typeof agents;
  aggregates: typeof aggregates;
  auth: typeof auth;
  authUtils: typeof authUtils;
  billingScope: typeof billingScope;
  broadcastPool: typeof broadcastPool;
  calendarEvents: typeof calendarEvents;
  channelSyncPools: typeof channelSyncPools;
  channels: typeof channels;
  "chat/audioUtils": typeof chat_audioUtils;
  "chat/channelSend": typeof chat_channelSend;
  "chat/inbox": typeof chat_inbox;
  "chat/inboxActions": typeof chat_inboxActions;
  "chat/inboxAudioIngest": typeof chat_inboxAudioIngest;
  "chat/inboxMessageMapping": typeof chat_inboxMessageMapping;
  "chat/mediaUrlExtractor": typeof chat_mediaUrlExtractor;
  "chat/streaming": typeof chat_streaming;
  "chat/threads": typeof chat_threads;
  cloudflare: typeof cloudflare;
  conversations: typeof conversations;
  creditBalance: typeof creditBalance;
  creditEntries: typeof creditEntries;
  creditLogs: typeof creditLogs;
  credits: typeof credits;
  crons: typeof crons;
  customers: typeof customers;
  debugTemplates: typeof debugTemplates;
  devReset: typeof devReset;
  followUpPool: typeof followUpPool;
  followUpQueries: typeof followUpQueries;
  http: typeof http;
  inboxPools: typeof inboxPools;
  instagramAuth: typeof instagramAuth;
  instagramConnect: typeof instagramConnect;
  instagramSend: typeof instagramSend;
  instagramSync: typeof instagramSync;
  instagramWebhook: typeof instagramWebhook;
  knowledgeBase: typeof knowledgeBase;
  knowledgeBaseImages: typeof knowledgeBaseImages;
  "leadRouting/assign": typeof leadRouting_assign;
  "leadRouting/eligibility": typeof leadRouting_eligibility;
  "leadRouting/helpers": typeof leadRouting_helpers;
  "leadRouting/provision": typeof leadRouting_provision;
  "leadRouting/schedules": typeof leadRouting_schedules;
  "leadRouting/settings": typeof leadRouting_settings;
  "llm/modelPricing": typeof llm_modelPricing;
  "llm/openRouter": typeof llm_openRouter;
  "media/attachments": typeof media_attachments;
  "media/r2": typeof media_r2;
  "media/r2Client": typeof media_r2Client;
  mediaPools: typeof mediaPools;
  messages: typeof messages;
  messengerAuth: typeof messengerAuth;
  messengerConnect: typeof messengerConnect;
  messengerSend: typeof messengerSend;
  messengerSync: typeof messengerSync;
  messengerWebhook: typeof messengerWebhook;
  metaWebhookShared: typeof metaWebhookShared;
  oauthSessions: typeof oauthSessions;
  oauthShared: typeof oauthShared;
  orgRoles: typeof orgRoles;
  organizations: typeof organizations;
  organizationsAdmin: typeof organizationsAdmin;
  planCatalog: typeof planCatalog;
  planStripe: typeof planStripe;
  plans: typeof plans;
  quickReplies: typeof quickReplies;
  signedRequest: typeof signedRequest;
  stripe: typeof stripe;
  teamAccess: typeof teamAccess;
  teamHelpers: typeof teamHelpers;
  teamInvitationRecords: typeof teamInvitationRecords;
  teamInvitations: typeof teamInvitations;
  teamMembers: typeof teamMembers;
  teamRoles: typeof teamRoles;
  teams: typeof teams;
  triggers: typeof triggers;
  usageMonthKey: typeof usageMonthKey;
  users: typeof users;
  whatsappBroadcast: typeof whatsappBroadcast;
  whatsappDemo: typeof whatsappDemo;
  whatsappEmbeddedSignup: typeof whatsappEmbeddedSignup;
  whatsappFollowUp: typeof whatsappFollowUp;
  whatsappSend: typeof whatsappSend;
  whatsappWebhook: typeof whatsappWebhook;
  workosClient: typeof workosClient;
  workosOrganizationActions: typeof workosOrganizationActions;
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
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  cfUploadWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"cfUploadWorkpool">;
  cfDeleteWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"cfDeleteWorkpool">;
  webScraperWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"webScraperWorkpool">;
  linkDiscovererWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"linkDiscovererWorkpool">;
  instagramSyncWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"instagramSyncWorkpool">;
  messengerSyncWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"messengerSyncWorkpool">;
  inboxAiReplyWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"inboxAiReplyWorkpool">;
  mediaDeleteWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"mediaDeleteWorkpool">;
  threadSummarizerWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"threadSummarizerWorkpool">;
  broadcastWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"broadcastWorkpool">;
  followUpWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"followUpWorkpool">;
  workOSAuthKit: import("@convex-dev/workos-authkit/_generated/component.js").ComponentApi<"workOSAuthKit">;
  crons: import("@convex-dev/crons/_generated/component.js").ComponentApi<"crons">;
  modelLifetimeUsage: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"modelLifetimeUsage">;
  modelMonthlyUsage: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"modelMonthlyUsage">;
  agentMonthlyUsage: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"agentMonthlyUsage">;
};

import { v } from 'convex/values';
import { action, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { buildGeminiLiveTokenRequest } from './avatarProvider';
import { DEFAULT_GEMINI_LIVE_VOICE } from '../shared/geminiLiveVoices';

type TokenResponse = {
  data?: {
    session_id?: string;
    session_token?: string;
  };
  message?: string;
};

type AvatarSessionArgs = {
  publicKey: string;
  visitorId: string;
};

type AvatarSessionAccess = {
  sessionId: string;
  sessionToken: string;
};

export const beginPreview = action({
  args: { publicKey: v.string(), visitorId: v.string() },
  handler: async (ctx, args) => await beginAvatarSession(ctx, args, true),
});

export const beginLive = action({
  args: { publicKey: v.string(), visitorId: v.string() },
  handler: async (ctx, args) => await beginAvatarSession(ctx, args, false),
});

async function beginAvatarSession(
  ctx: ActionCtx,
  args: AvatarSessionArgs,
  sandbox: boolean,
): Promise<AvatarSessionAccess> {
    const configuration = await ctx.runQuery(internal.avatar.internalGetConfiguration, {
      publicKey: args.publicKey,
    });
    const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
    if (!apiKey) throw new Error('LIVEAVATAR_API_KEY is required');
    await ctx.runQuery(internal.avatar.assertSessionCapacity, {
      publicKey: args.publicKey,
    });
    const avatarId = configuration.avatarId?.trim();
    if (!avatarId) throw new Error('Avatar must be configured');
    const contextId = configuration.providerContextId?.trim();
    if (!contextId) throw new Error('Save an Avatar context before starting a session');
    const secretId = process.env.HEYGEN_GEMINI_SECRET_ID?.trim();
    if (!secretId) throw new Error('HEYGEN_GEMINI_SECRET_ID is required');

    const response = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(buildGeminiLiveTokenRequest({
        sandbox,
        avatarId,
        contextId,
        secretId,
        voice: configuration.geminiVoice ?? DEFAULT_GEMINI_LIVE_VOICE,
      })),
    });
    const body = await response.json() as TokenResponse;
    const sessionId = body.data?.session_id;
    const sessionToken = body.data?.session_token;
    if (!response.ok || !sessionId || !sessionToken) {
      throw new Error(body.message || 'LiveAvatar session token request failed');
    }
    await ctx.runMutation(internal.avatar.registerSession, {
      publicKey: args.publicKey,
      visitorId: args.visitorId,
      sessionId,
      isSandbox: sandbox,
    });
    return { sessionId, sessionToken };
}

import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { buildLiveAvatarTokenRequest, parseSandboxMode } from './avatarProvider';

type TokenResponse = {
  data?: {
    session_id?: string;
    session_token?: string;
  };
  message?: string;
};

export const begin = action({
  args: { publicKey: v.string(), visitorId: v.string() },
  handler: async (ctx, args): Promise<{
    sessionId: string;
    sessionToken: string;
  }> => {
    const configuration = await ctx.runQuery(internal.avatar.internalGetConfiguration, {
      publicKey: args.publicKey,
    });
    const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
    if (!apiKey) throw new Error('LIVEAVATAR_API_KEY is required');
    const sandbox = parseSandboxMode(process.env.HEYGEN_SANDBOX_MODE);
    await ctx.runQuery(internal.avatar.assertSessionCapacity, {
      publicKey: args.publicKey,
    });
    const avatarId = configuration.avatarId?.trim();
    const voiceId = configuration.voiceId?.trim();
    if (!avatarId || !voiceId) throw new Error('Avatar and voice must be configured');

    const response = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(buildLiveAvatarTokenRequest({
        sandbox,
        avatarId,
        voiceId,
        language: configuration.language,
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
  },
});

import { v } from 'convex/values';
import { action, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  DEFAULT_AVATAR_OPENING_TEXT,
  buildDefaultAvatarInstructions,
} from '../shared/avatarContextDefaults';

type ProviderResponse = {
  data?: { id?: string } | null;
  message?: string;
};

type AvatarSetupContext = {
  configurationId: Id<'avatarConfigurations'>;
  contextId?: string;
  agentName: string;
  businessName: string;
  businessDescription: string;
};

export function buildAvatarContextPrompt(prompt: string, openingText: string) {
  return `${prompt.trim()}\n\nStart each new conversation with this opening message:\n${openingText.trim()}`;
}

function requireApiKey() {
  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) throw new Error('LIVEAVATAR_API_KEY is required');
  return apiKey;
}

async function writeLiveAvatarContext(
  setup: Pick<AvatarSetupContext, 'contextId' | 'agentName'>,
  prompt: string,
  openingText: string,
) {
  const response = await fetch(
    setup.contextId
      ? `https://api.liveavatar.com/v1/contexts/${encodeURIComponent(setup.contextId)}`
      : 'https://api.liveavatar.com/v1/contexts',
    {
      method: setup.contextId ? 'PATCH' : 'POST',
      headers: {
        'X-API-KEY': requireApiKey(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: `${setup.agentName} Avatar`,
        prompt: buildAvatarContextPrompt(prompt, openingText),
        opening_text: openingText,
      }),
    },
  );
  const body = await response.json() as ProviderResponse;
  const contextId = body.data?.id;
  if (!response.ok || !contextId) {
    throw new Error(body.message || 'LiveAvatar context save failed');
  }
  return contextId;
}

export async function ensureDefaultAvatarContext(ctx: ActionCtx, setup: AvatarSetupContext) {
  if (setup.contextId) return setup.contextId;
  const prompt = buildDefaultAvatarInstructions({
    businessName: setup.businessName,
    businessDescription: setup.businessDescription,
  });
  const openingText = DEFAULT_AVATAR_OPENING_TEXT;
  const contextId = await writeLiveAvatarContext(setup, prompt, openingText);
  await ctx.runMutation(internal.avatar.saveProviderContext, {
    configurationId: setup.configurationId,
    contextId,
    prompt,
    openingText,
  });
  return contextId;
}

export const save = action({
  args: {
    agentId: v.id('agents'),
    prompt: v.string(),
    openingText: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const prompt = args.prompt.trim();
    const openingText = args.openingText.trim();
    if (!prompt) throw new Error('System instructions are required');
    if (!openingText) throw new Error('Opening text is required');
    const setup = await ctx.runQuery(internal.avatar.internalGetSetupContext, {
      agentId: args.agentId,
    });
    const contextId = await writeLiveAvatarContext(setup, prompt, openingText);
    await ctx.runMutation(internal.avatar.saveProviderContext, {
      configurationId: setup.configurationId,
      contextId,
      prompt,
      openingText,
    });
    return null;
  },
});

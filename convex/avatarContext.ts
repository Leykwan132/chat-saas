import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

type ProviderResponse = {
  data?: { id?: string } | null;
  message?: string;
};

export function buildAvatarContextPrompt(prompt: string, openingText: string) {
  return `${prompt.trim()}\n\nStart each new conversation with this opening message:\n${openingText.trim()}`;
}

function requireApiKey() {
  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) throw new Error('LIVEAVATAR_API_KEY is required');
  return apiKey;
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
        }),
      },
    );
    const body = await response.json() as ProviderResponse;
    const contextId = body.data?.id;
    if (!response.ok || !contextId) {
      throw new Error(body.message || 'LiveAvatar context save failed');
    }
    await ctx.runMutation(internal.avatar.saveProviderContext, {
      configurationId: setup.configurationId,
      contextId,
      prompt,
      openingText,
    });
    return null;
  },
});

import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { MAX_AVATAR_SESSION_DURATION_SECONDS } from './avatarProvider';

export async function countActiveAvatarSessions(
  ctx: QueryCtx | MutationCtx,
  configurationId: Id<'avatarConfigurations'>,
) {
  const recent = await ctx.db
    .query('avatarSessions')
    .withIndex('by_configurationId_and_startedAt', (q) => q
      .eq('configurationId', configurationId)
      .gte('startedAt', Date.now() - MAX_AVATAR_SESSION_DURATION_SECONDS * 1000))
    .order('desc')
    .take(100);
  const now = Date.now();
  return recent.filter((session) => {
    const durationSeconds = session.isSandbox ? 90 : MAX_AVATAR_SESSION_DURATION_SECONDS;
    return session.status === 'active' && session.startedAt >= now - durationSeconds * 1000;
  }).length;
}

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export async function createExternalStateSafely<T>(args: {
  assertCanCreate: () => Promise<void>;
  create: () => Promise<T>;
  register: (value: T, cleanupRequired: boolean) => Promise<boolean>;
  remove: (value: T) => Promise<void>;
  release: (value: T) => Promise<void>;
}): Promise<T> {
  await args.assertCanCreate();
  const value = await args.create();
  let cleanupRequired = false;
  for (;;) {
    let workspaceAvailable: boolean;
    try {
      workspaceAvailable = await args.register(value, cleanupRequired);
    } catch (registrationError) {
      cleanupRequired = true;
      try {
        await args.remove(value);
      } catch {
        continue;
      }
      throw registrationError;
    }
    if (!workspaceAvailable) {
      await args.remove(value);
      await args.release(value);
      throw new Error("Workspace unavailable");
    }
    return value;
  }
}

export async function assertWorkspaceCanCreateExternalState(
  ctx: ActionCtx,
  orgId: string,
): Promise<void> {
  const canProcess = await ctx.runQuery(
    internal.teamDeletion.access.canProcess,
    { orgId },
  );
  if (!canProcess) throw new Error("Workspace unavailable");
}

export async function createWorkspaceExternalState(
  ctx: ActionCtx,
  orgId: string,
  provider: "cloudflare" | "r2" | "metaMedia",
  create: () => Promise<string>,
  remove: (value: string) => Promise<void>,
  authorization?: string,
): Promise<string> {
  let trackedResourceId: Id<"teamExternalResources"> | undefined;
  return await createExternalStateSafely({
    assertCanCreate: async () =>
      await assertWorkspaceCanCreateExternalState(ctx, orgId),
    create,
    register: async (resourceId, cleanupRequired) => {
      const registration = await ctx.runMutation(
        internal.teamDeletion.externalResourceState.register,
        {
          orgId,
          provider,
          resourceId,
          authorization,
          cleanupRequired,
        },
      );
      trackedResourceId = registration.resourceId;
      return registration.workspaceAvailable;
    },
    remove,
    release: async () => {
      if (!trackedResourceId) {
        throw new Error("External resource registration is missing");
      }
      await ctx.runMutation(
        internal.teamDeletion.externalResourceState.remove,
        { resourceId: trackedResourceId },
      );
    },
  });
}

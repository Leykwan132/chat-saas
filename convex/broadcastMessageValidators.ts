import { v } from "convex/values";

export const messageKindValidator = v.literal("broadcast");

export const broadcastHeaderAssetValidator = v.object({
  url: v.string(),
  mimeType: v.string(),
  filename: v.string(),
  headerFormat: v.union(
    v.literal("IMAGE"),
    v.literal("VIDEO"),
    v.literal("DOCUMENT"),
  ),
});

export const broadcastPresentationValidator = v.object({
  headerAsset: v.optional(broadcastHeaderAssetValidator),
});

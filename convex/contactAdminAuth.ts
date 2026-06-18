import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { nanoid } from "nanoid";
import {
  assertValidEmailFormat,
  isValidEmailFormat,
  normalizeEmailInput,
} from "../shared/emailValidation";

const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials";

export function getAllowedAdminEmails(): Set<string> {
  const raw = process.env.ALLOWED_ADMIN_EMAIL ?? "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ALLOWED_ADMIN_EMAIL must be a JSON array of email strings");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("ALLOWED_ADMIN_EMAIL must be a JSON array of email strings");
  }

  const emails = parsed
    .filter((value): value is string => typeof value === "string")
    .map((value) => normalizeEmailInput(value))
    .filter(Boolean);

  return new Set(emails);
}

function isAllowedAdminEmail(email: string): boolean {
  const allowed = getAllowedAdminEmails();
  return allowed.has(normalizeEmailInput(email));
}

function assertAdminCode(code: string): void {
  const expected = process.env.ADMIN_CODE;
  if (!expected) {
    throw new Error("ADMIN_CODE is not configured");
  }
  if (code.trim() !== expected) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }
}

export async function assertAdminSession(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string,
): Promise<{ email: string }> {
  const token = sessionToken.trim();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt <= Date.now()) {
    throw new Error("Session expired");
  }

  return { email: session.email };
}

export const validateAdminSession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await assertAdminSession(ctx, args.sessionToken);
      return { valid: true as const };
    } catch {
      return { valid: false as const };
    }
  },
});

export const checkAdminEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!isValidEmailFormat(args.email)) {
      return { allowed: false };
    }
    return {
      allowed: isAllowedAdminEmail(args.email),
    };
  },
});

export const authenticateAdmin = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    let email: string;
    try {
      email = normalizeEmailInput(assertValidEmailFormat(args.email));
    } catch {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!isAllowedAdminEmail(email)) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    assertAdminCode(args.code);

    const now = Date.now();
    const token = nanoid(48);
    const expiresAt = now + ADMIN_SESSION_TTL_MS;

    await ctx.db.insert("adminSessions", {
      token,
      email,
      expiresAt,
      createdAt: now,
    });

    return { token, expiresAt };
  },
});

export const logoutAdmin = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const token = args.sessionToken.trim();
    if (!token) {
      return { ok: true };
    }

    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { ok: true };
  },
});

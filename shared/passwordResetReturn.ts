export function parsePasswordResetOrigin(origin: string) {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("Invalid reset origin.");
  }
  if (origin !== url.origin) {
    throw new Error("Invalid reset origin.");
  }
  const hostname = url.hostname.trim().toLowerCase();
  const isLocal = hostname === "localhost" || hostname.endsWith(".localhost");
  if (isLocal) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid reset origin.");
    }
  } else if (url.protocol !== "https:") {
    throw new Error("Invalid reset origin.");
  }
  return { origin: url.origin, hostname };
}

export function isNativeAuthHostname(hostname: string) {
  return (
    hostname === "kilobot.app" ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  );
}

export function sanitizePasswordResetReturnPath(path: string) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("://")
  ) {
    return "/sign-in";
  }
  return path;
}

export function buildSameOriginPasswordResetUrl(args: {
  origin: string;
  token: string;
  returnPath: string;
}) {
  const url = new URL("/reset-password", args.origin);
  url.searchParams.set("token", args.token);
  url.searchParams.set(
    "returnTo",
    sanitizePasswordResetReturnPath(args.returnPath),
  );
  return url.toString();
}

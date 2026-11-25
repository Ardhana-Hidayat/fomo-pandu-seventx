export const OAUTH_STATE_COOKIE_NAME = "ik_oauth_state";

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();

  if (forwardedHost) {
    const proto = forwardedProto || url.protocol.replace(":", "") || "https";
    return `${proto}://${forwardedHost}`;
  }

  return url.origin;
}

export function getGoogleOAuthConfig(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

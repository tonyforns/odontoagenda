import { NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/auth";
import { getLastAuthError } from "@/lib/auth-debug";
import {
  googleOAuthCallbackUrl,
  resolvePublicOrigin,
} from "@/lib/auth-public-url";
import { hasDatabaseUrl } from "@/lib/db";

export async function GET(request: Request) {
  const origin = resolvePublicOrigin({
    authUrl: process.env.AUTH_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
  });

  return NextResponse.json({
    googleConfigured: isGoogleAuthConfigured(),
    callbackUrl: googleOAuthCallbackUrl(origin),
    authUrl: origin,
    hasDatabaseUrl: hasDatabaseUrl(),
    hasAuthSecret: Boolean(
      (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim(),
    ),
    authSecretLength: (
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      ""
    ).trim().length,
    lastAuthError: getLastAuthError(),
  });
}

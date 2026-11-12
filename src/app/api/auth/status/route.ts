import { NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/auth";
import {
  googleOAuthCallbackUrl,
  resolvePublicOrigin,
} from "@/lib/auth-public-url";

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
  });
}

import { NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/auth";

export async function GET() {
  return NextResponse.json({
    googleConfigured: isGoogleAuthConfigured(),
  });
}

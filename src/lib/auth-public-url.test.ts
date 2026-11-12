import { describe, expect, it } from "vitest";
import {
  googleOAuthCallbackUrl,
  resolvePublicOrigin,
} from "@/lib/auth-public-url";

describe("auth-public-url", () => {
  it("prefers AUTH_URL origin", () => {
    expect(
      resolvePublicOrigin({
        authUrl: "https://odontoagenda.vercel.app/",
        host: "localhost:3847",
      }),
    ).toBe("https://odontoagenda.vercel.app");
  });

  it("uses forwarded host on Vercel-style requests", () => {
    expect(
      resolvePublicOrigin({
        authUrl: null,
        forwardedHost: "odontoagenda.vercel.app",
        forwardedProto: "https",
      }),
    ).toBe("https://odontoagenda.vercel.app");
  });

  it("builds the Google callback path", () => {
    expect(googleOAuthCallbackUrl("https://odontoagenda.vercel.app")).toBe(
      "https://odontoagenda.vercel.app/api/auth/callback/google",
    );
  });
});

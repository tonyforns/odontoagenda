import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertFromGoogleSession } from "@/lib/patients";
import { isMockBookingMode } from "@/lib/mock-mode";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      googleSub?: string;
      hasCalendarAccess?: boolean;
    };
  }
}

export function isGoogleAuthConfigured() {
  return Boolean(
    (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
      (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET),
  );
}

const googleClientId =
  process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";

/** En mock no pedimos Calendar: el consent es más simple y el login más estable. */
function googleScopes() {
  const base = ["openid", "email", "profile"];
  if (!isMockBookingMode()) {
    base.push("https://www.googleapis.com/auth/calendar.events");
  }
  return base.join(" ");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      issuer: "https://accounts.google.com",
      authorization: {
        params: {
          scope: googleScopes(),
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
      // Sin discovery OIDC: Google a veces no manda `iss` → "iss missing".
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
    }),
  ],
  pages: {
    signIn: "/reservar",
    error: "/reservar",
  },
  callbacks: {
    async signIn({ account }) {
      // Solo Google; si el proveedor falla, Auth.js ya corta antes.
      return account?.provider === "google";
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google") {
        token.googleSub =
          account.providerAccountId ||
          (profile as { sub?: string } | undefined)?.sub ||
          token.sub;
        if (account.refresh_token) {
          token.googleRefreshToken = account.refresh_token;
          token.hasCalendarAccess = true;
        }
        if (account.scope?.includes("calendar.events")) {
          token.hasCalendarAccess = true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.googleSub =
          (token.googleSub as string | undefined) ||
          (token.sub as string | undefined);
        session.user.hasCalendarAccess = Boolean(token.hasCalendarAccess);
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return;
      const googleSub =
        account.providerAccountId ||
        (profile as { sub?: string } | undefined)?.sub;
      const email = user.email?.trim().toLowerCase();
      if (!googleSub || !email) return;

      try {
        await upsertFromGoogleSession({
          googleSub,
          email,
          name: user.name,
          refreshToken: account.refresh_token ?? undefined,
        });
      } catch (error) {
        console.error("[auth] upsertFromGoogleSession failed", error);
      }
    },
  },
  logger: {
    error(error) {
      console.error("[auth][error]", error);
    },
  },
});

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertFromGoogleSession } from "@/lib/patients";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET ||
        "",
      // Evita el discovery OIDC: Google declara iss supported pero a veces
      // no lo manda en el callback → oauth4webapi tira "iss missing".
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    }),
  ],
  trustHost: true,
  pages: {
    signIn: "/reservar",
  },
  callbacks: {
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

      await upsertFromGoogleSession({
        googleSub,
        email,
        name: user.name,
        refreshToken: account.refresh_token ?? undefined,
      });
    },
  },
});

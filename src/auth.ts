import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { rememberAuthError } from "@/lib/auth-debug";
import { upsertFromGoogleSession } from "@/lib/patients";
import {
  linkStaffGoogleSub,
  resolveAppRole,
} from "@/lib/staff";
import type { AppRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      googleSub?: string;
      hasCalendarAccess?: boolean;
      role?: AppRole;
      doctorId?: string | null;
    };
  }
}

type AuthJwtFields = {
  googleSub?: string;
  googleRefreshToken?: string;
  hasCalendarAccess?: boolean;
  role?: AppRole;
  doctorId?: string | null;
  email?: string | null;
  sub?: string;
};

function asAuthJwt(token: unknown): AuthJwtFields {
  return (token ?? {}) as AuthJwtFields;
}

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function isGoogleAuthConfigured() {
  return Boolean(
    (env("AUTH_GOOGLE_ID") || env("GOOGLE_CLIENT_ID")) &&
      (env("AUTH_GOOGLE_SECRET") || env("GOOGLE_CLIENT_SECRET")),
  );
}

const googleClientId = env("AUTH_GOOGLE_ID") || env("GOOGLE_CLIENT_ID");
const googleClientSecret =
  env("AUTH_GOOGLE_SECRET") || env("GOOGLE_CLIENT_SECRET");
const authSecret = env("AUTH_SECRET") || env("NEXTAUTH_SECRET");

function googleScopes() {
  return [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret || undefined,
  trustHost: true,
  session: { strategy: "jwt" },
  debug: process.env.AUTH_DEBUG === "1" || process.env.VERCEL === "1",
  providers: isGoogleAuthConfigured()
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          // Obligatorio si overrideamos token/userinfo: si no, issuer cae en
          // "https://authjs.dev" y el id_token de Google falla → Configuration.
          issuer: "https://accounts.google.com",
          authorization: {
            params: {
              scope: googleScopes(),
              access_type: "offline",
              prompt: "select_account",
              response_type: "code",
            },
          },
          // Evita discovery OIDC (a veces dispara "iss missing").
          token: "https://oauth2.googleapis.com/token",
          userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
          client: {
            token_endpoint_auth_method: "client_secret_post",
          },
        }),
      ]
    : [],
  pages: {
    signIn: "/reservar",
    error: "/reservar",
  },
  callbacks: {
    async signIn({ account }) {
      return account?.provider === "google";
    },
    async jwt({ token, account, profile }) {
      const jwt = token as typeof token & AuthJwtFields;

      if (account?.provider === "google") {
        jwt.googleSub =
          account.providerAccountId ||
          (profile as { sub?: string } | undefined)?.sub ||
          token.sub;
        if (account.refresh_token) {
          jwt.googleRefreshToken = account.refresh_token;
          jwt.hasCalendarAccess = true;
        }
        if (account.scope?.includes("calendar.events")) {
          jwt.hasCalendarAccess = true;
        }
      }

      const email =
        typeof jwt.email === "string" ? jwt.email : undefined;
      const googleSub =
        (typeof jwt.googleSub === "string" ? jwt.googleSub : undefined) ||
        (typeof jwt.sub === "string" ? jwt.sub : undefined);

      try {
        const { role, staff } = await resolveAppRole({ email, googleSub });
        jwt.role = role;
        jwt.doctorId = staff?.doctorId ?? null;
      } catch (error) {
        console.error("[auth] resolveAppRole failed", error);
        jwt.role = jwt.role ?? "paciente";
      }

      return jwt;
    },
    async session({ session, token }) {
      if (session.user) {
        const jwt = asAuthJwt(token);
        session.user.googleSub =
          (typeof jwt.googleSub === "string" ? jwt.googleSub : undefined) ||
          (typeof jwt.sub === "string" ? jwt.sub : undefined);
        session.user.hasCalendarAccess = Boolean(jwt.hasCalendarAccess);
        session.user.role =
          typeof jwt.role === "string" ? jwt.role : "paciente";
        session.user.doctorId =
          typeof jwt.doctorId === "string" ? jwt.doctorId : null;
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

      try {
        await linkStaffGoogleSub({ email, googleSub });
      } catch (error) {
        console.error("[auth] linkStaffGoogleSub failed", error);
      }
    },
  },
  logger: {
    error(error) {
      rememberAuthError(error);
      console.error("[auth][error]", error);
    },
  },
});

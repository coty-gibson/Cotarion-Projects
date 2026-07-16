import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  assertDevelopmentAuthIsNotEnabledOutsideDevelopment,
  DEVELOPMENT_AUTH_PROVIDER_ID,
  DEVELOPMENT_AUTH_USER,
  isDevelopmentAuthEnabled
} from "@/infrastructure/auth/dev-auth";
import { prisma } from "@/infrastructure/database/prisma";

assertDevelopmentAuthIsNotEnabledOutsideDevelopment();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(isDevelopmentAuthEnabled()
      ? [
          CredentialsProvider({
            id: DEVELOPMENT_AUTH_PROVIDER_ID,
            name: "Development sign-in",
            credentials: {},
            async authorize() {
              return DEVELOPMENT_AUTH_USER;
            }
          })
        ]
      : [])
  ],
  pages: {
    signIn: "/sign-in"
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    }
  }
};

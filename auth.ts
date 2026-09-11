import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import authConfig from "./auth.config";
import { prisma } from "./src/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.workspaceId = user.workspaceId;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.workspaceId = token.workspaceId as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
});
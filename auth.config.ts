import type { NextAuthConfig } from "next-auth";

const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        return isLoggedIn;
      }

      return true;
    },
  },

  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
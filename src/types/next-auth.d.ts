import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    /** users.passwordChangedAt at sign-in ("" if never changed). Used to revoke sessions on reset. */
    pwdAt?: string;
  }
  interface Session {
    user: { id: string; pwdAt?: string } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    pwdAt?: string;
  }
}

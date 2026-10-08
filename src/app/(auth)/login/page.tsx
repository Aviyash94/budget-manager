import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Budget Manager to see your monthly budget, spending and what is left.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; reason?: string }>;
}) {
  const { reset, reason } = await searchParams;
  const notice =
    reset === "1"
      ? "Your password was changed. Sign in with the new one."
      : reason === "session"
        ? "You were signed out. Please sign in again."
        : undefined;

  return <AuthForm mode="login" notice={notice} />;
}

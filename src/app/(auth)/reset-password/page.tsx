import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/server/db";
import { INVALID_LINK, isResetTokenValid } from "@/server/password-reset";
import { AuthShell, FormError } from "../auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  // The URL carries the secret token: don't leak it to other sites through the Referer header.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  if (!(await isResetTokenValid(getDb(), token))) {
    return (
      <AuthShell icon="⏰" title="Link expired">
        <div className="card space-y-4">
          <FormError>{INVALID_LINK}</FormError>
          <Link href="/forgot-password" className="btn w-full">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return <ResetForm token={token} />;
}

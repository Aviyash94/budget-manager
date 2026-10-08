"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword, type ForgotState } from "../actions";
import { AuthShell, FormError, Notice } from "../auth-shell";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPassword, undefined);

  return (
    <AuthShell
      icon="🔑"
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send you a link to choose a new one."
    >
      {state?.sent ? (
        <div className="card space-y-3">
          <Notice>Check your inbox</Notice>
          <p className="text-sm text-ink-soft">
            If an account exists for that email, a reset link is on its way. It works once and
            expires in 1 hour. Nothing arrived after a few minutes? Check your spam folder, then try
            again.
          </p>
        </div>
      ) : (
        <form action={action} className="card space-y-4">
          <label className="label">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={state?.email}
              placeholder="you@example.com"
              className="input"
            />
          </label>
          {state?.error && <FormError>{state.error}</FormError>}
          <button type="submit" disabled={pending} className="btn w-full">
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-ink-soft">
        <Link href="/login" className="font-extrabold text-lav-deep underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

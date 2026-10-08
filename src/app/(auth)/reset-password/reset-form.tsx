"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "../actions";
import { AuthShell, FormError } from "../auth-shell";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    undefined,
  );

  return (
    <AuthShell
      icon="🔐"
      title="Choose a new password"
      subtitle="Pick something you haven’t used before."
    >
      <form action={action} className="card space-y-4">
        <input type="hidden" name="token" value={token} />
        <label className="label">
          New password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="input"
          />
          <span className="font-semibold">At least 8 characters.</span>
        </label>
        <label className="label">
          Confirm new password
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="input"
          />
        </label>
        {state?.error && <FormError>{state.error}</FormError>}
        <button type="submit" disabled={pending} className="btn w-full">
          {pending ? "Saving…" : "Change password"}
        </button>
      </form>
    </AuthShell>
  );
}

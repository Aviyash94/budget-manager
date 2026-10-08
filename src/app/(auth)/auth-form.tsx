"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "./actions";
import { AuthShell, FormError, Notice } from "./auth-shell";

export function AuthForm({ mode, notice }: { mode: "login" | "register"; notice?: string }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<FormState, FormData>(
    isLogin ? login : register,
    undefined,
  );

  return (
    <AuthShell
      title={isLogin ? "Welcome back" : "Let’s get started"}
      subtitle={isLogin ? "Sign in to see your budget." : "Create an account to plan your month."}
    >
      {notice && <Notice>{notice}</Notice>}

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
        <label className="label">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="input"
          />
          {!isLogin && <span className="font-semibold">At least 8 characters.</span>}
        </label>

        {isLogin && (
          <p className="-mt-1 text-right text-sm">
            <Link href="/forgot-password" className="font-bold text-lav-deep underline">
              Forgot password?
            </Link>
          </p>
        )}

        {state?.error && <FormError>{state.error}</FormError>}

        <button type="submit" disabled={pending} className="btn w-full">
          {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-extrabold text-lav-deep underline"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </AuthShell>
  );
}

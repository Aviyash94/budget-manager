"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "./actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<FormState, FormData>(
    isLogin ? login : register,
    undefined,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto grid size-16 place-items-center rounded-3xl bg-pink text-3xl shadow-sm"
        >
          💸
        </span>
        <h1 className="mt-4 text-3xl font-black">
          {isLogin ? "Welcome back" : "Let’s get started"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {isLogin ? "Sign in to see your budget." : "Create an account to plan your month."}
        </p>
      </div>

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

        {state?.error && (
          <p
            role="alert"
            className="rounded-2xl bg-pink-soft px-4 py-3 text-sm font-bold text-pink-deep ring-1 ring-pink"
          >
            ⚠️ {state.error}
          </p>
        )}

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
    </main>
  );
}

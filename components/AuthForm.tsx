"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Something went wrong.");
      router.push(isLogin ? searchParams.get("next") || "/" : "/login");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <div className="auth-glow glow-left" />
      <div className="auth-glow glow-right" />
      <section className="auth-card">
        <Link href="/" className="brand auth-brand">
          <span className="brand-mark">R</span>relayboard
        </Link>
        <p className="eyebrow auth-eyebrow">Secure access</p>
        <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-copy">
          {isLogin
            ? "Sign in to manage your proxy routes and upstreams."
            : "Set up your Relayboard workspace in a few seconds."}
        </p>
        <form onSubmit={submit} className="auth-form">
          {!isLogin && (
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                placeholder="your handle"
                required
                minLength={2}
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder={isLogin ? "Your password" : "At least 8 characters"}
              required
              minLength={8}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="primary-button full-width" disabled={busy}>
            {busy
              ? isLogin
                ? "Signing you in..."
                : "Creating account..."
              : isLogin
                ? "Sign in →"
                : "Create account →"}
          </button>
        </form>
        <p className="auth-switch">
          {isLogin ? "New to Relayboard?" : "Already have an account?"}{" "}
          <Link href={isLogin ? "/signup" : "/login"}>
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
        <p className="auth-note">
          Your session is stored in an encrypted, httpOnly cookie.
        </p>
      </section>
    </main>
  );
}

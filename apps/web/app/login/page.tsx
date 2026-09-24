"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearSession, errorMessage } from "@/lib/api";
import { Field, Notice } from "@/components/ui";
import type { Session } from "@/lib/types";
export default function LoginPage() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      clearSession();
      const result = await api<{ accessToken: string }>(
        register ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: String(form.get("email")).trim(),
            password: form.get("password"),
          }),
        },
        false,
      );
      localStorage.setItem("placementos_token", result.accessToken);
      const user = await api<Session>("/auth/me");
      localStorage.setItem("placementos_user", JSON.stringify(user));
      router.replace("/dashboard");
    } catch (e) {
      clearSession();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">P</span>PlacementOS
        </div>
        <p className="eyebrow">WHERE POTENTIAL MEETS OPPORTUNITY</p>
        <h1>
          Your future,
          <br />
          one opportunity
          <br />
          at a time.
        </h1>
        <p>
          A shared space for students, recruiters, and campus teams to make the
          next move count.
        </p>
      </section>
      <section className="login-form">
        <h2>{register ? "Start your journey" : "Welcome back"}</h2>
        <p>
          {register
            ? "Create your student account. Recruiter access is assigned by your administrator."
            : "Sign in to your PlacementOS workspace."}
        </p>
        <Notice error={error} />
        <form onSubmit={submit}>
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={8}
            required
          />
          <button disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"} →
          </button>
        </form>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register
            ? "Already have an account? Sign in"
            : "New student? Create an account"}
        </button>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api, errorMessage, signOut } from "@/lib/api";
import type { Role, Session } from "@/lib/types";

import { Icon } from "./product";

const SessionContext = createContext<Session | null>(null);
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Session provider is required");
  return session;
}

export function Workspace({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function verify() {
      try {
        const user = await api<Session>("/auth/me");
        if (active) {
          localStorage.setItem("placementos_user", JSON.stringify(user));
          setSession(user);
          setError("");
        }
      } catch (e) {
        if (active) setError(errorMessage(e));
      }
    }
    void verify();
    const focus = () => {
      void verify();
    };
    const storage = (e: StorageEvent) => {
      if (e.key === "placementos_token") signOut();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("storage", storage);
    return () => {
      active = false;
      window.removeEventListener("focus", focus);
      window.removeEventListener("storage", storage);
    };
  }, [pathname, attempt]);
  if (error)
    return (
      <main className="auth-panel">
        <h1>Unable to check your session</h1>
        <p role="alert">{error}</p>
        <button
          onClick={() => {
            setError("");
            setAttempt(attempt + 1);
          }}
        >
          Try again
        </button>
        <button className="secondary" onClick={signOut}>
          Sign out
        </button>
      </main>
    );
  if (!session)
    return (
      <main className="auth-panel" role="status">
        Checking your session…
      </main>
    );
  const links = [
    ["/dashboard", "Overview"],
    [
      "/dashboard/jobs",
      session.role === "STUDENT" ? "Find opportunities" : "Jobs",
    ],
    [
      "/dashboard/applications",
      session.role === "STUDENT" ? "My applications" : "Applicants",
    ],
    ...(session.role !== "ADMIN"
      ? [["/dashboard/profile", "My profile"]]
      : [
          ["/admin/users", "Users"],
          ["/admin/companies", "Companies"],
          ["/admin/recruiters", "Recruiters"],
        ]),
  ];
  return (
    <SessionContext.Provider value={session}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">P</span>PlacementOS
        </Link>
        <div className="account">
          <span className="account-email" title={session.email}>
            {session.email}
          </span>
          <span className="badge">{session.role}</span>
          <button className="secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
        <button
          ref={menuButton}
          className="secondary menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          Workspace menu <span aria-hidden="true">{menuOpen ? "−" : "+"}</span>
        </button>
      </header>
      <div className="workspace">
        <nav
          id="workspace-navigation"
          className={`workspace-nav${menuOpen ? " is-open" : ""}`}
          aria-label="Main navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              menuButton.current?.focus();
            }
          }}
        >
          <p className="nav-label">
            {session.role === "ADMIN"
              ? "CAMPUS MANAGEMENT"
              : session.role === "RECRUITER"
                ? "HIRING WORKSPACE"
                : "YOUR CAREER"}
          </p>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(`${href}/`))
                  ? "page"
                  : undefined
              }
            >
              <Icon
                name={
                  href.endsWith("jobs")
                    ? "jobs"
                    : href.endsWith("companies")
                      ? "building"
                      : href.endsWith("profile")
                        ? "profile"
                        : href === "/dashboard"
                          ? "grid"
                          : "people"
                }
              />{" "}
              {label}
            </Link>
          ))}
          <p className="nav-note">
            {session.role === "STUDENT"
              ? "Your next chapter starts with one small step."
              : "Bring people and opportunity together."}
          </p>
        </nav>
        <main id="main" className="content">
          {roles && !roles.includes(session.role) ? (
            <>
              <h1>Access restricted</h1>
              <p>This page is not available for your current role.</p>
              <Link href="/dashboard">Return to overview</Link>
            </>
          ) : (
            children
          )}
        </main>
      </div>
    </SessionContext.Provider>
  );
}

import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-panel">
      <h1>Page not found</h1>
      <p>This page may have moved.</p>
      <Link className="button" href="/dashboard">
        Return to workspace
      </Link>
    </main>
  );
}

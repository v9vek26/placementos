"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-panel">
      <h1>Something went wrong</h1>
      <p>We could not display this page. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}

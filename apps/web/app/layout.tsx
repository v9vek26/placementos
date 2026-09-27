import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "PlacementOS", template: "%s | PlacementOS" },
  description: "Connect students, recruiters, and campus opportunities.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A fresh CSP nonce is attached to Next's scripts for every page response.
  await connection();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "PlacementOS", template: "%s | PlacementOS" },
  description: "Connect students, recruiters, and campus opportunities.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

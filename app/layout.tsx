import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relayboard · Proxy control plane",
  description: "A clear control plane for proxy routes and upstreams.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plomari Firewatch Map",
  description:
    "A public, source-labeled situational-awareness map for the Plomari wildfire.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

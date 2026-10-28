import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Run Query — PostgreSQL SQL Practice Platform",
  description: "Production-ready analytical SQL practice platform powered by Supabase PostgreSQL.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

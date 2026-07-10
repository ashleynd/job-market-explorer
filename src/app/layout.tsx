import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Market Explorer",
  description:
    "Ask questions about the tech job market in plain English — skill demand, salaries, and remote work trends, powered by AI.",
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

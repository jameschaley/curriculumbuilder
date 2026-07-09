import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mixed-Age Curriculum Builder",
  description: "Editable curriculum planning for mixed-age and overlapping cohorts"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

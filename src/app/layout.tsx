import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { body } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "timologion",
  description:
    "Online εφαρμογή τιμολόγησης για ελεύθερους επαγγελματίες και μικρές επιχειρήσεις. Πελατολόγιο, παραστατικά, αναφορές — σε ένα καθαρό dashboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B1B3A",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="el"
      className={body.variable}
    >
      <body>{children}</body>
    </html>
  );
}

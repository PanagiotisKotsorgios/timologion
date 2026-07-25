import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { body } from "@/lib/fonts";
import { SITE, SITE_KEYWORDS } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.defaultTitle,
    template: SITE.titleTemplate,
  },
  description: SITE.defaultDescription,
  keywords: [...SITE_KEYWORDS],
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "Business Software",
  generator: "Next.js",
  alternates: {
    canonical: SITE.url,
    languages: {
      "el-GR": SITE.url,
    },
  },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    locale: SITE.locale,
    images: [
      {
        url: SITE.ogImagePath,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.shortTagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    images: [SITE.ogImagePath],
    site: "@timologion",
    creator: "@timologion",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/logo.png" }],
    shortcut: ["/logo.png"],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: true,
    email: true,
    address: false,
  },
  other: {
    "geo.region": "GR",
    "geo.placename": "Greece",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B1B3A",
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={SITE.language}
      className={body.variable}
    >
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { env } from "@/lib/env";

/**
 * Central SEO configuration for the timologion / Τιμολόγιον marketing site.
 * All page-level metadata should be produced by `pageMetadata()` so titles,
 * OpenGraph, Twitter cards, canonicals and robots stay consistent.
 *
 * Keyword strategy: pair every English SaaS term (invoicing, e-invoicing, POS,
 * CRM) with the Greek search term users actually type into Google — τιμολόγιο,
 * τιμολόγιον, ηλεκτρονική τιμολόγηση, myDATA, ΑΑΔΕ, παραστατικά, ΦΠΑ, ΓΓΠΣ.
 */

const PRODUCTION_URL = "https://timologion.gr";

/**
 * Absolute site URL for canonicals, OG tags and JSON-LD. Never uses a
 * localhost fallback because leaking `http://localhost:3000` into meta tags
 * poisons Google's canonical resolution and OG image previews. If APP_BASE_URL
 * isn't a real production URL, we force the known production host.
 */
function resolveSiteUrl(): string {
  const raw = env.APP_BASE_URL?.replace(/\/$/, "") ?? "";
  if (!raw || raw.startsWith("http://localhost") || raw.startsWith("http://127.")) {
    return PRODUCTION_URL;
  }
  return raw;
}

export const SITE = {
  name: "Τιμολόγιον",
  altName: "timologion",
  domain: "timologion.gr",
  url: resolveSiteUrl(),
  locale: "el_GR",
  language: "el",
  defaultTitle: "Τιμολόγιον | Πρόγραμμα Ηλεκτρονικής Τιμολόγησης myDATA",
  titleTemplate: "%s | Τιμολόγιον",
  shortTagline: "Πρόγραμμα ηλεκτρονικής τιμολόγησης myDATA",
  defaultDescription:
    "Τιμολόγιον: ελληνικό online πρόγραμμα ηλεκτρονικής τιμολόγησης με άμεση σύνδεση στο myDATA της ΑΑΔΕ. Έκδοση παραστατικών, αναζήτηση ΑΦΜ, πελατολόγιο, POS, CRM. Ξεκίνα δωρεάν — χωρίς κάρτα.",
  contactEmail: "support@timologion.gr",
  phone: "+30 2631 028971",
  logoPath: "/logo.png",
  ogImagePath: "/logo.png",
} as const;

/**
 * High-intent Greek keywords for organic search. Order roughly by priority.
 * Kept broad on purpose — page-level metadata layers extra keywords on top.
 */
export const SITE_KEYWORDS = [
  "τιμολόγιο",
  "τιμολόγιον",
  "τιμολογιον",
  "ηλεκτρονική τιμολόγηση",
  "ηλεκτρονικη τιμολογηση",
  "myDATA",
  "mydata ΑΑΔΕ",
  "ΑΑΔΕ",
  "ΓΓΠΣ",
  "παραστατικά",
  "παραστατικα",
  "έκδοση τιμολογίων",
  "έκδοση παραστατικών",
  "τιμολόγηση online",
  "e-invoicing Ελλάδα",
  "πρόγραμμα τιμολόγησης",
  "λογιστικό πρόγραμμα",
  "ΦΠΑ",
  "ΑΦΜ αναζήτηση",
  "πελατολόγιο",
  "CRM ελληνικά",
  "POS ελληνικά",
  "ελεύθερος επαγγελματίας",
  "μικρή επιχείρηση",
  "SaaS τιμολόγηση",
  "invoicing Greece",
  "timologion",
] as const;

const SOCIAL = {
  twitter: "@timologion",
} as const;

type PageMetadataInput = {
  /** Page title fragment. Combined with the layout template unless `absoluteTitle` is true. */
  title: string;
  /**
   * If true, `title` is emitted as-is with no site-name suffix — use on the
   * home page and on any page whose title already includes "Τιμολόγιον".
   */
  absoluteTitle?: boolean;
  /** Falls back to the site default. Aim for 140–170 chars, keyword-rich. */
  description?: string;
  /** Absolute path (e.g. "/pricing"). Used for canonical + OG url. */
  path?: string;
  /** Extra keywords appended after the shared SITE_KEYWORDS. */
  keywords?: readonly string[];
  /** Override the OG image (defaults to /logo.png). */
  ogImage?: string;
  /** Set to true for auth or transactional pages that shouldn't index. */
  noIndex?: boolean;
  /** Use "article" for blog / guide posts. */
  ogType?: "website" | "article";
  /** Published-at for articles. */
  publishedTime?: string;
};

export function pageMetadata(input: PageMetadataInput): Metadata {
  const path = input.path ?? "/";
  const absoluteUrl = `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
  const description = input.description ?? SITE.defaultDescription;
  const ogImage = input.ogImage ?? SITE.ogImagePath;
  const keywords = [...SITE_KEYWORDS, ...(input.keywords ?? [])];

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    keywords: [...keywords],
    alternates: {
      canonical: absoluteUrl,
    },
    openGraph: {
      type: input.ogType ?? "website",
      url: absoluteUrl,
      siteName: SITE.name,
      title: input.title,
      description,
      locale: SITE.locale,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: SITE.name,
        },
      ],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [ogImage],
      site: SOCIAL.twitter,
      creator: SOCIAL.twitter,
    },
    robots: input.noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
  };
}

/**
 * JSON-LD schema.org objects — inject with a `<script type="application/ld+json">`
 * tag inside <head> of the relevant page. Two here cover 90% of the value:
 * Organization for brand knowledge-panel, SoftwareApplication for the app pin.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    alternateName: SITE.altName,
    url: SITE.url,
    logo: `${SITE.url}${SITE.logoPath}`,
    email: SITE.contactEmail,
    telephone: SITE.phone,
    sameAs: [`https://${SITE.domain}`],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE.contactEmail,
        telephone: SITE.phone,
        areaServed: "GR",
        availableLanguage: ["Greek", "English"],
      },
    ],
  };
}

export function softwareAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    alternateName: SITE.altName,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Invoicing",
    operatingSystem: "Web",
    inLanguage: SITE.language,
    url: SITE.url,
    description: SITE.defaultDescription,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: "6.90",
      highPrice: "29.90",
      offerCount: 3,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.altName,
    url: SITE.url,
    inLanguage: SITE.language,
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}${SITE.logoPath}`,
      },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE.url}${it.url}`,
    })),
  };
}

/**
 * Render helper for JSON-LD script tags. Use inside a component's returned JSX.
 */
export function jsonLdScript(data: unknown, id?: string) {
  return {
    __html: JSON.stringify(data),
    id,
  };
}

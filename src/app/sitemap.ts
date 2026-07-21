import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { GUIDES } from "./(marketing)/guides/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.APP_BASE_URL.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1.0, lastModified: now },
    {
      url: `${base}/features`,
      changeFrequency: "weekly",
      priority: 0.9,
      lastModified: now,
    },
    {
      url: `${base}/pricing`,
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified: now,
    },
    {
      url: `${base}/guides`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: now,
    },
    {
      url: `${base}/contact`,
      changeFrequency: "monthly",
      priority: 0.6,
      lastModified: now,
    },
    {
      url: `${base}/login`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified: now,
    },
    {
      url: `${base}/register`,
      changeFrequency: "yearly",
      priority: 0.5,
      lastModified: now,
    },
    {
      url: `${base}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified: now,
    },
    {
      url: `${base}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified: now,
    },
    {
      url: `${base}/cookies`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified: now,
    },
  ];

  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${base}/guides/${g.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    lastModified: now,
  }));

  return [...staticRoutes, ...guideRoutes];
}

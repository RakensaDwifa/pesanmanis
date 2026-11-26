import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { SEO_TOPICS } from "@/lib/seo-topics";
import { getActiveTemplates } from "@/lib/templates";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.baseUrl;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/templates`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/custom`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/kebijakan-privasi`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/syarat-ketentuan`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const previewRoutes: MetadataRoute.Sitemap = getActiveTemplates().map((tpl) => ({
    url: `${base}/preview/${tpl.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  const topicRoutes: MetadataRoute.Sitemap = SEO_TOPICS.map((topic) => ({
    url: `${base}/ucapan/${topic.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  return [...staticRoutes, ...previewRoutes, ...topicRoutes];
}

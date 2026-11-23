import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Konten personal sudah memakai robots noindex per halaman; biarkan /t/ & /u/
        // dapat diambil crawler medsos (WhatsApp, Twitter, dll) untuk share preview.
        disallow: ["/dashboard", "/admin", "/api/", "/checkout", "/buat"],
      },
    ],
    sitemap: `${BRAND.baseUrl}/sitemap.xml`,
  };
}

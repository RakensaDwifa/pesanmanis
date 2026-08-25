import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Konten personal & privat tidak diindex
        disallow: ["/t/", "/dashboard", "/admin", "/api/", "/checkout", "/buat"],
      },
    ],
    sitemap: `${BRAND.baseUrl}/sitemap.xml`,
  };
}

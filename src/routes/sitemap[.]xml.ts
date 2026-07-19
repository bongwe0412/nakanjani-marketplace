import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const [{ data: cats }, { data: vendors }, { data: products }] = await Promise.all([
          supabase.from("categories").select("slug").eq("is_active", true),
          supabase.from("vendors").select("slug").eq("verification_status", "approved"),
          supabase.from("products").select("slug").eq("status", "active").limit(500),
        ]);
        const paths = [
          "/", "/products", "/wishlist", "/search", "/vendors", "/deals",
          "/support/contact", "/support/faq", "/support/returns",
          "/support/shipping", "/support/terms", "/support/privacy",
          ...(cats ?? []).map((c) => `/category/${c.slug}`),
          ...(vendors ?? []).map((v) => `/vendor/${v.slug}`),
          ...(products ?? []).map((p) => `/product/${p.slug}`),
        ];
        const urls = paths.map((p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
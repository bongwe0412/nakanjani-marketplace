import { supabase } from "@/integrations/supabase/client";
import type { Category, Product, Review, Vendor } from "@/lib/mock-data";

const SUPABASE_PUBLIC = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`;
const SUPABASE_AUTH = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated`;

function uuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Build a publicly-fetchable URL for a `bucket/path` storage reference.
 * Buckets in this project are private but their RLS allows anon SELECT,
 * so the `/object/<bucket>/<path>` endpoint with the anon key works.
 */
export function storageObjectUrl(bucketPath: string | null | undefined): string | null {
  if (!bucketPath) return null;
  if (bucketPath.startsWith("http")) return bucketPath;
  const slash = bucketPath.indexOf("/");
  if (slash === -1) return null;
  // Try the "public" endpoint first — works if the bucket is later made public.
  // For private buckets we use createSignedUrl in caller, this is the cheap path.
  return `${SUPABASE_PUBLIC}/${bucketPath}`;
}

/** Long-lived signed URL for a private storage object (`bucket/path`). */
export async function signedStorageUrl(bucketPath: string | null | undefined): Promise<string | null> {
  if (!bucketPath) return null;
  if (bucketPath.startsWith("http")) return bucketPath;
  const slash = bucketPath.indexOf("/");
  if (slash === -1) return null;
  const bucket = bucketPath.slice(0, slash);
  const path = bucketPath.slice(slash + 1);
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

export type PublicVariant = {
  id: string;
  sku: string | null;
  option_1_name: string | null;
  option_1_value: string | null;
  option_2_name: string | null;
  option_2_value: string | null;
  option_3_name: string | null;
  option_3_value: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
};

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  short_description: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  category_id: string | null;
  vendor_id: string;
  featured: boolean;
  status: string;
  dimensions: unknown;
  product_images: { image_url: string; sort_order: number }[];
  product_variants?: {
    id: string;
    sku: string | null;
    option_1_name: string | null;
    option_1_value: string | null;
    option_2_name: string | null;
    option_2_value: string | null;
    option_3_name: string | null;
    option_3_value: string | null;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    active: boolean;
  }[];
  vendors: {
    id: string;
    slug: string;
    store_name: string;
    description: string | null;
    logo_url: string | null;
    banner_url: string | null;
    rating: number;
    followers_count: number;
    verification_status: string;
    created_at: string;
  } | null;
  categories: { slug: string } | null;
  view_count?: number | null;
};


async function resolveImageUrls(images: { image_url: string }[]): Promise<string[]> {
  if (images.length === 0) return [];
  const urls = await Promise.all(
    images.map(async (img) => (await signedStorageUrl(img.image_url)) ?? storageObjectUrl(img.image_url)),
  );
  return urls.filter((u): u is string => Boolean(u));
}

function specsFromDimensions(dim: unknown): Record<string, string> {
  if (!dim || typeof dim !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(dim as Record<string, unknown>)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

async function mapDbProduct(row: DbProduct): Promise<{ product: Product; vendor: Vendor; vendorId: string; variants: PublicVariant[] }> {
  const sortedImgs = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);
  const images = await resolveImageUrls(sortedImgs);
  const vendor: Vendor = row.vendors
    ? {
        slug: row.vendors.slug,
        name: row.vendors.store_name,
        logo: (await signedStorageUrl(row.vendors.logo_url)) ?? "/placeholder.svg",
        banner: (await signedStorageUrl(row.vendors.banner_url)) ?? "/placeholder.svg",
        rating: Number(row.vendors.rating ?? 0),
        followers: row.vendors.followers_count ?? 0,
        description: row.vendors.description ?? "",
        verified: row.vendors.verification_status === "approved",
        memberSince: new Date(row.vendors.created_at).getFullYear().toString(),
      }
    : {
        slug: "unknown",
        name: "Unknown vendor",
        logo: "/placeholder.svg",
        banner: "/placeholder.svg",
        rating: 0,
        followers: 0,
        description: "",
        verified: false,
        memberSince: "—",
      };

  const variants: PublicVariant[] = (row.product_variants ?? [])
    .filter((v) => v.active)
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      option_1_name: v.option_1_name,
      option_1_value: v.option_1_value,
      option_2_name: v.option_2_name,
      option_2_value: v.option_2_value,
      option_3_name: v.option_3_name,
      option_3_value: v.option_3_value,
      price: Number(v.price),
      compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
      stock_quantity: v.stock_quantity,
    }));

  const product: Product = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? "",
    category: row.categories?.slug ?? "uncategorized",
    vendor: vendor.slug,
    vendorName: vendor.name,
    vendorVerified: vendor.verified,
    price: Number(row.price),
    originalPrice: row.compare_at_price != null ? Number(row.compare_at_price) : undefined,
    rating: 0,
    reviews: 0,
    stock: row.stock_quantity,
    images: images.length ? images : ["/placeholder.svg"],
    description: row.description ?? row.short_description ?? "",
    specs: specsFromDimensions(row.dimensions),
    tags: row.featured ? ["featured"] : [],
  };

  return { product, vendor, vendorId: row.vendor_id, variants };
}

/** Lookup a public product by uuid OR slug. Supabase only — no fallback. */
export async function loadPublicProduct(
  idOrSlug: string,
): Promise<{ product: Product; vendor: Vendor; vendorId: string; variants: PublicVariant[] } | null> {
  const selector = `
    id, slug, name, brand, short_description, description, price, compare_at_price,
    stock_quantity, category_id, vendor_id, featured, status, dimensions,
    product_images ( image_url, sort_order ),
    product_variants ( id, sku, option_1_name, option_1_value, option_2_name, option_2_value, option_3_name, option_3_value, price, compare_at_price, stock_quantity, active ),
    vendors ( id, slug, store_name, description, logo_url, banner_url, rating, followers_count, verification_status, created_at ),
    categories ( slug )
  `;

  let query = supabase.from("products").select(selector).eq("status", "active").limit(1);
  query = uuidLike(idOrSlug) ? query.eq("id", idOrSlug) : query.eq("slug", idOrSlug);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  return await mapDbProduct(data as unknown as DbProduct);
}


/** Public list of active products. Supabase only. */
export async function loadPublicProducts(opts: {
  limit?: number;
  featured?: boolean;
  categorySlug?: string;
  vendorSlug?: string;
  orderBy?: "newest" | "trending" | "price-asc" | "price-desc";
  onSale?: boolean;
  search?: string;
} = {}): Promise<Product[]> {
  const selector = `
    id, slug, name, brand, short_description, description, price, compare_at_price,
    stock_quantity, category_id, vendor_id, featured, status, dimensions, view_count,
    product_images ( image_url, sort_order ),
    vendors ( id, slug, store_name, description, logo_url, banner_url, rating, followers_count, verification_status, created_at ),
    categories ( slug )
  `;
  let q = supabase.from("products").select(selector).eq("status", "active");
  if (opts.featured) q = q.eq("featured", true);
  if (opts.onSale) q = q.not("compare_at_price", "is", null);
  if (opts.search) q = q.or(`name.ilike.%${opts.search}%,brand.ilike.%${opts.search}%`);
  if (opts.categorySlug) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", opts.categorySlug).maybeSingle();
    if (!cat) return [];
    q = q.eq("category_id", cat.id);
  }
  if (opts.vendorSlug) {
    const { data: v } = await supabase.from("vendors").select("id").eq("slug", opts.vendorSlug).maybeSingle();
    if (!v) return [];
    q = q.eq("vendor_id", v.id);
  }
  switch (opts.orderBy) {
    case "trending": q = q.order("view_count", { ascending: false }); break;
    case "price-asc": q = q.order("price", { ascending: true }); break;
    case "price-desc": q = q.order("price", { ascending: false }); break;
    default: q = q.order("created_at", { ascending: false }); break;
  }
  q = q.limit(opts.limit ?? 24);
  const { data } = await q;

  const mapped: Product[] = [];
  for (const row of (data ?? []) as unknown as DbProduct[]) {
    mapped.push((await mapDbProduct(row)).product);
  }
  return mapped;
}

/** Resolve a list of product UUIDs to Product objects, preserving input order. */
export async function loadProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const uuidIds = ids.filter(uuidLike);
  if (uuidIds.length === 0) return [];

  const selector = `
    id, slug, name, brand, short_description, description, price, compare_at_price,
    stock_quantity, category_id, vendor_id, featured, status, dimensions,
    product_images ( image_url, sort_order ),
    vendors ( id, slug, store_name, description, logo_url, banner_url, rating, followers_count, verification_status, created_at ),
    categories ( slug )
  `;

  const dbMap = new Map<string, Product>();
  const { data } = await supabase
    .from("products")
    .select(selector)
    .in("id", uuidIds)
    .eq("status", "active");
  for (const row of (data ?? []) as unknown as DbProduct[]) {
    const { product } = await mapDbProduct(row);
    dbMap.set(product.id, product);
  }
  return ids.map((id) => dbMap.get(id)).filter((p): p is Product => Boolean(p));
}

/** Public categories list. */
export async function loadCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from("categories")
    .select("slug, name, icon, image_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const out: Category[] = [];
  for (const c of data ?? []) {
    const img = c.image_url ? (await signedStorageUrl(c.image_url)) ?? storageObjectUrl(c.image_url) : null;
    out.push({ slug: c.slug, name: c.name, icon: c.icon ?? null, image: img });
  }
  return out;
}

/** Approved vendors list. */
export async function loadVendors(limit = 24): Promise<Vendor[]> {
  const { data } = await supabase
    .from("vendors")
    .select("slug, store_name, description, logo_url, banner_url, rating, followers_count, verification_status, created_at")
    .eq("verification_status", "approved")
    .order("rating", { ascending: false })
    .limit(limit);
  const out: Vendor[] = [];
  for (const v of data ?? []) {
    out.push({
      slug: v.slug,
      name: v.store_name,
      logo: (await signedStorageUrl(v.logo_url)) ?? "/placeholder.svg",
      banner: (await signedStorageUrl(v.banner_url)) ?? "/placeholder.svg",
      rating: Number(v.rating ?? 0),
      followers: v.followers_count ?? 0,
      description: v.description ?? "",
      verified: true,
      memberSince: new Date(v.created_at).getFullYear().toString(),
    });
  }
  return out;
}

export async function loadVendorBySlug(slug: string): Promise<Vendor | null> {
  const { data: v } = await supabase
    .from("vendors")
    .select("slug, store_name, description, logo_url, banner_url, rating, followers_count, verification_status, created_at")
    .eq("slug", slug)
    .eq("verification_status", "approved")
    .maybeSingle();
  if (!v) return null;
  return {
    slug: v.slug,
    name: v.store_name,
    logo: (await signedStorageUrl(v.logo_url)) ?? "/placeholder.svg",
    banner: (await signedStorageUrl(v.banner_url)) ?? "/placeholder.svg",
    rating: Number(v.rating ?? 0),
    followers: v.followers_count ?? 0,
    description: v.description ?? "",
    verified: true,
    memberSince: new Date(v.created_at).getFullYear().toString(),
  };
}

/** Reviews for a product (newest first). */
export async function loadProductReviews(productId: string): Promise<Review[]> {
  const { data } = await supabase
    .from("product_reviews")
    .select("id, product_id, user_id, rating, title, body, verified, helpful_count, created_at, profiles:user_id (full_name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    user: r.profiles?.full_name ?? "Shopper",
    rating: r.rating,
    date: new Date(r.created_at).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" }),
    title: r.title,
    body: r.body,
    verified: r.verified,
    helpful: r.helpful_count ?? 0,
  }));
}

/** Distinct, non-empty brand list across active products. */
export async function loadBrands(): Promise<string[]> {
  const { data } = await supabase.from("products").select("brand").eq("status", "active").not("brand", "is", null);
  const set = new Set<string>();
  for (const r of data ?? []) if (r.brand) set.add(r.brand);
  return Array.from(set).sort();
}


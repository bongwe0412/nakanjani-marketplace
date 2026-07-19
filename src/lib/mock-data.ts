// Shared storefront types + utilities.
// All data now lives in Supabase — there is no mock catalog.

export type Category = {
  slug: string;
  name: string;
  icon: string | null;
  image: string | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  /** Category slug (or empty string when uncategorised). */
  category: string;
  /** Vendor slug. */
  vendor: string;
  vendorName?: string;
  vendorVerified?: boolean;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  stock: number;
  images: string[];
  description: string;
  specs: Record<string, string>;
  tags: string[];
};

export type Vendor = {
  slug: string;
  name: string;
  logo: string;
  banner: string;
  rating: number;
  followers: number;
  description: string;
  verified: boolean;
  memberSince: string;
};

export type Review = {
  id: string;
  productId: string;
  user: string;
  rating: number;
  date: string;
  title: string | null;
  body: string | null;
  verified: boolean;
  helpful: number;
};

export const formatZAR = (n: number) =>
  "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

import { supabase } from "@/integrations/supabase/client";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Returns a long-lived signed URL for a private storage object.
 * Pass a value like "vendor-logos/<userId>/logo.png" (bucket/path) OR null.
 */
export async function getStorageUrl(bucketPath: string | null): Promise<string | null> {
  if (!bucketPath) return null;
  const slash = bucketPath.indexOf("/");
  if (slash === -1) return null;
  const bucket = bucketPath.slice(0, slash);
  const path = bucketPath.slice(slash + 1);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ONE_YEAR);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

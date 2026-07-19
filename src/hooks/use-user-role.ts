import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

export type VendorStatus = "none" | "pending" | "approved" | "rejected" | "suspended";

export type UserRoleInfo = {
  isAdmin: boolean;
  vendorStatus: VendorStatus;
  isVendor: boolean;
  isPendingVendor: boolean;
};

export function useUserRole(): UserRoleInfo & { isLoading: boolean } {
  const { userId } = useStore();
  const { data, isLoading } = useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<UserRoleInfo> => {
      if (!userId) return { isAdmin: false, vendorStatus: "none", isVendor: false, isPendingVendor: false };
      const [{ data: adminFlag }, { data: vendorRow }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.from("vendors").select("verification_status").eq("user_id", userId).maybeSingle(),
      ]);
      const status = (vendorRow?.verification_status ?? "none") as VendorStatus;
      return {
        isAdmin: !!adminFlag,
        vendorStatus: status,
        isVendor: status === "approved",
        isPendingVendor: status === "pending",
      };
    },
  });
  return {
    isAdmin: data?.isAdmin ?? false,
    vendorStatus: data?.vendorStatus ?? "none",
    isVendor: data?.isVendor ?? false,
    isPendingVendor: data?.isPendingVendor ?? false,
    isLoading,
  };
}
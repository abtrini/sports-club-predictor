import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AppUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: "member" | "admin";
  participantId: string | null;
};

export type AdminUser = AppUser & { role: "admin" };

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error) return null;

  const userId = claimsData?.claims?.sub as string | undefined;
  const email = (claimsData?.claims?.email as string | undefined) ?? null;
  if (!userId) return null;

  const [{ data: profile }, { data: participantId }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("current_participant_id"),
  ]);

  if (!profile || (profile.role !== "member" && profile.role !== "admin")) return null;

  return {
    id: userId,
    email,
    fullName: profile.full_name || "Club member",
    role: profile.role,
    participantId: typeof participantId === "string" ? participantId : null,
  };
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user as AdminUser;
}

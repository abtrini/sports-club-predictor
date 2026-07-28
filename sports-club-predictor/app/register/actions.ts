"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function registerRedirect(message: string): never {
  redirect(`/register?message=${encodeURIComponent(message)}`);
}

export async function registerPlayerAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const clubCode = String(formData.get("clubCode") ?? "").trim();
  const requiredCode = process.env.CLUB_REGISTRATION_CODE?.trim();

  if (fullName.length < 2) registerRedirect("Enter your full name.");
  if (!email.includes("@")) registerRedirect("Enter a valid email address.");
  if (password.length < 6) registerRedirect("Password must contain at least 6 characters.");
  if (password !== confirmPassword) registerRedirect("The passwords do not match.");
  if (requiredCode && clubCode !== requiredCode) registerRedirect("The club registration code is incorrect.");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        register_as_player: true,
      },
      ...(siteUrl ? { emailRedirectTo: `${siteUrl}/auth/confirm` } : {}),
    },
  });

  if (error) registerRedirect(error.message);

  revalidatePath("/", "layout");

  if (data.session) {
    redirect("/predictions?message=Registration%20complete.%20You%20can%20now%20enter%20predictions.");
  }

  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20registration,%20then%20sign%20in.&next=%2Fpredictions");
}

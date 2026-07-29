"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function forgotPasswordRedirect(message: string, status: "error" | "sent") {
  redirect(
    `/forgot-password?message=${encodeURIComponent(message)}&status=${status}`,
  );
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    forgotPasswordRedirect("Supabase is not configured yet.", "error");
  }

  if (!email || !email.includes("@")) {
    forgotPasswordRedirect("Enter a valid email address.", "error");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!siteUrl) {
    forgotPasswordRedirect(
      "NEXT_PUBLIC_SITE_URL is missing from the environment variables.",
      "error",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm`,
  });

  if (error) {
    forgotPasswordRedirect(
      "The reset email could not be sent right now. Wait a moment and try again.",
      "error",
    );
  }

  forgotPasswordRedirect(
    "If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.",
    "sent",
  );
}

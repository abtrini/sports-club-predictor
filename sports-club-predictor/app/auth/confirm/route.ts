import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const defaultNext = type === "recovery" ? "/update-password" : "/predictions";
  const next = safeNextPath(searchParams.get("next"), defaultNext);
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      redirectTo.searchParams.set(
        "message",
        type === "recovery"
          ? "Reset link verified. Choose your new password."
          : "Email confirmed. Your player account is ready.",
      );
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = type === "recovery" ? "/forgot-password" : "/login";
  redirectTo.search = "";
  redirectTo.searchParams.set(
    "message",
    type === "recovery"
      ? "The password-reset link is invalid or expired. Request a new link."
      : "The confirmation link is invalid or expired.",
  );
  redirectTo.searchParams.set("status", "error");

  if (type !== "recovery") {
    redirectTo.searchParams.set("next", "/predictions");
  }

  return NextResponse.redirect(redirectTo);
}

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = "/predictions";
  redirectTo.search = "?message=Email%20confirmed.%20Your%20player%20account%20is%20ready.";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/login";
  redirectTo.search = "?message=The%20confirmation%20link%20is%20invalid%20or%20expired.&next=%2Fpredictions";
  return NextResponse.redirect(redirectTo);
}

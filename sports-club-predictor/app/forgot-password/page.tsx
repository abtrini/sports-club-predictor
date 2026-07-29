import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requestPasswordResetAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    status?: "error" | "sent";
  }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/update-password");

  const { message, status = "error" } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="page-width narrow page-top section-block">
      <section className="content-card security-card">
        <p className="eyebrow dark">ACCOUNT RECOVERY</p>
        <h1>Forgot your password?</h1>
        <p>
          Enter the email address used for your player account. We will send a
          secure link that lets you choose a new password.
        </p>

        <div className="admin-alert admin-alert-info">
          <strong>Security notice:</strong> For privacy, the confirmation
          message is the same whether or not the email exists in the system.
        </div>

        {message && (
          <div
            className={`admin-alert ${
              status === "sent"
                ? "admin-alert-success"
                : "admin-alert-danger"
            }`}
            role="status"
          >
            {message}
          </div>
        )}

        {!configured ? (
          <div className="admin-alert admin-alert-warning">
            Supabase is not configured yet. Complete the environment-variable
            setup first.
          </div>
        ) : (
          <form action={requestPasswordResetAction} className="stack-form">
            <label>
              Account email
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <button className="button button-primary" type="submit">
              Send password-reset email
            </button>
          </form>
        )}

        <p className="form-footnote">
          Remembered your password? <Link href="/login">Return to sign in.</Link>
        </p>
      </section>
    </main>
  );
}

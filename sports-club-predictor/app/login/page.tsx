import Link from "next/link";
import { loginAction } from "./actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; next?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/predictions");
  }

  const { message, next } = await searchParams;
  const configured = isSupabaseConfigured();
  const nextPath =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/predictions";

  return (
    <section className="page-width narrow page-top section-block">
      <div className="content-card">
        <p className="eyebrow dark">CLUB ACCESS</p>
        <h1>Sign in</h1>
        <p>
          Players can enter predictions. Approved administrators can manage the
          competition.
        </p>
        {message && <div className="form-message">{message}</div>}
        {!configured ? (
          <div className="notice">
            Supabase is not configured yet. Follow README.md first.
          </div>
        ) : (
          <form action={loginAction} className="stack-form">
            <input type="hidden" name="next" value={nextPath} />
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button className="button button-primary" type="submit">
              Sign in
            </button>
          </form>
        )}
        <p className="form-footnote security-recovery-link">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="form-footnote">
          New player?{" "}
          <Link href="/register">Register for the 20-person league.</Link>
        </p>
      </div>
    </section>
  );
}

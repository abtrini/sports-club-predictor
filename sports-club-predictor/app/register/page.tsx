import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { registerPlayerAction } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <section className="page-width narrow page-top section-block">
      <div className="content-card">
        <p className="eyebrow dark">PLAYER REGISTRATION</p>
        <h1>Join the prediction league</h1>
        <p>
          Create your personal account. The league accepts a maximum of 20 active participants.
        </p>
        {message && <div className="form-message">{message}</div>}
        {!configured ? (
          <div className="notice">Supabase is not configured yet. Follow README.md first.</div>
        ) : (
          <form action={registerPlayerAction} className="stack-form">
            <label>
              Full name
              <input name="fullName" required minLength={2} autoComplete="name" placeholder="e.g. Anthony Bobb" />
            </label>
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Club registration code
              <input name="clubCode" type="password" autoComplete="off" placeholder="Provided by the club administrator" />
            </label>
            <div className="two-column-fields">
              <label>
                Password
                <input name="password" type="password" minLength={6} required autoComplete="new-password" />
              </label>
              <label>
                Confirm password
                <input name="confirmPassword" type="password" minLength={6} required autoComplete="new-password" />
              </label>
            </div>
            <button className="button button-primary" type="submit">Register as a player</button>
          </form>
        )}
        <p className="form-footnote">
          Already registered? <Link href="/login?next=/predictions">Sign in to enter predictions.</Link>
        </p>
      </div>
    </section>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  return (
    <main className="page-width page-top section-block">
      <div className="account-page-header">
        <p className="eyebrow dark">ACCOUNT</p>
        <h1>Account settings</h1>
        <p>Manage your login security and personal account information.</p>
      </div>

      <section className="content-card account-security-card">
        <div>
          <span className="account-card-label">Signed in as</span>
          <h2>{user.fullName}</h2>
          <p>Use a strong password that you do not use on another website.</p>
        </div>

        <Link className="button button-primary" href="/update-password">
          Change password
        </Link>
      </section>
    </main>
  );
}

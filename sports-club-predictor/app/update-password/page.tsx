import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { updatePasswordAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    status?: "error" | "success";
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      "/login?message=Sign%20in%20or%20use%20the%20forgot-password%20link%20before%20changing%20your%20password.&next=%2Fupdate-password",
    );
  }

  const { message, status = "error" } = await searchParams;

  return (
    <main className="page-width narrow page-top section-block">
      <section className="content-card security-card">
        <p className="eyebrow dark">ACCOUNT SECURITY</p>
        <h1>Change your password</h1>
        <p>
          Signed in as <strong>{user.email ?? user.fullName}</strong>. Choose a
          new password that you do not use on another website.
        </p>

        <div className="admin-alert admin-alert-warning">
          <strong>Important:</strong> Never share your password or a reset link
          with another player or administrator.
        </div>

        {message && (
          <div
            className={`admin-alert ${
              status === "success"
                ? "admin-alert-success"
                : "admin-alert-danger"
            }`}
            role="status"
          >
            {message}
          </div>
        )}

        <form action={updatePasswordAction} className="stack-form">
          <label>
            New password
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <button className="button button-primary" type="submit">
            Update my password
          </button>
        </form>

        <div className="security-page-actions">
          <Link className="button button-secondary" href="/predictions">
            Return to my predictions
          </Link>
          {user.role === "admin" && (
            <Link className="button button-secondary" href="/admin">
              Return to Admin Portal
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

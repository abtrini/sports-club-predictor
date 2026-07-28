import Link from "next/link";
import { signOutAction } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";

const publicLinks = [
  ["/standings", "Standings"],
  ["/fixtures", "Fixtures"],
  ["/rules", "Rules"],
] as const;

export async function Header() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">SC</span>

          <span>
            <strong>Sports Club Predictor</strong>
            <small>2026/27 season</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {publicLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}

          {user ? (
            <>
              <Link href="/predictions">My predictions</Link>

              {isAdmin && (
                <Link className="admin-nav-link" href="/admin">
                  Admin Portal
                </Link>
              )}

              <form action={signOutAction} className="nav-signout-form">
                <button className="nav-signout-button" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/register">Register</Link>
              <Link href="/login">Sign in</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

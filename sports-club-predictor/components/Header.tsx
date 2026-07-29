import Link from "next/link";
import { signOutAction } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";
import Image from "next/image";
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
        <Link
          className="brand"
          href="/"
          aria-label="Sports Club Predictor home"
        >
          <Image
            className="brand-logo"
            src="/gscc-logo.png"
            alt="Guardian Sports and Cultural Club logo"
            width={54}
            height={54}
            priority
          />

          <span className="brand-text">
            <strong>GSCC Predictor</strong>
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

              <Link href="/account">Account</Link>

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

import Link from "next/link";

const links = [
  ["/", "Standings"],
  ["/fixtures", "Fixtures"],
  ["/predictions", "My predictions"],
  ["/rules", "Rules"],
  ["/register", "Register"],
  ["/login", "Sign in"],
  ["/admin", "Admin"],
] as const;

export function Header() {
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
        <nav aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

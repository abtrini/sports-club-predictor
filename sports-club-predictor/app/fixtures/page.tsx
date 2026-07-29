import Link from "next/link";

import { FixtureCard } from "@/components/FixtureCard";
import { getCurrentUser } from "@/lib/auth";
import { getFixtures } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const [fixtures, user] = await Promise.all([getFixtures(), getCurrentUser()]);

  const isAdmin = user?.role === "admin";

  const upcomingFixtures = fixtures
    .filter((fixture) => fixture.status !== "completed")
    .sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
    );

  const completedFixtures = fixtures
    .filter((fixture) => fixture.status === "completed")
    .sort(
      (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime(),
    );

  return (
    <main className="page-width page-top section-block">
      <header className="section-heading">
        <div>
          <p className="eyebrow dark">ADMIN-SELECTED GAMES</p>
          <h1>Fixtures and cutoffs</h1>
        </div>

        <p>All times are shown in Trinidad and Tobago time.</p>
      </header>

      <div className="notice">
        Predictions lock automatically{" "}
        <strong>15 minutes before kickoff</strong>. Players may save or revise
        their scores before that time.
      </div>

      <div className="hero-actions">
        {!user && (
          <>
            <Link className="button button-primary" href="/register">
              Register as a player
            </Link>

            <Link className="button button-secondary" href="/login">
              Sign in
            </Link>
          </>
        )}

        {user && !isAdmin && (
          <>
            <Link className="button button-primary" href="/predictions">
              Enter my predictions
            </Link>

            <Link className="button button-secondary" href="/standings">
              View standings
            </Link>
          </>
        )}

        {user && isAdmin && (
          <>
            <Link className="button button-primary" href="/admin">
              Open Admin Portal
            </Link>

            <Link className="button button-secondary" href="/predictions">
              My predictions
            </Link>
          </>
        )}
      </div>

      <section className="fixture-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">UPCOMING</p>
            <h2>Open and scheduled games</h2>
          </div>

          <span>
            {upcomingFixtures.length}{" "}
            {upcomingFixtures.length === 1 ? "game" : "games"}
          </span>
        </div>

        {upcomingFixtures.length > 0 ? (
          <div className="fixture-grid">
            {upcomingFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        ) : (
          <div className="content-card empty-state">
            <h3>No upcoming games</h3>
            <p>
              The administrator has not selected any upcoming prediction games.
            </p>
          </div>
        )}
      </section>

      {completedFixtures.length > 0 && (
        <section className="fixture-section completed-fixtures-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">RESULTS</p>
              <h2>Completed games</h2>
            </div>

            <span>
              {completedFixtures.length}{" "}
              {completedFixtures.length === 1
                ? "completed game"
                : "completed games"}
            </span>
          </div>

          <div className="fixture-grid">
            {completedFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

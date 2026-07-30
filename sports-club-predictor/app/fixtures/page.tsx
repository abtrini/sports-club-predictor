import Link from "next/link";

import { FixtureCard } from "@/components/FixtureCard";
import { getFixtures } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const fixtures = await getFixtures({
    fallbackToDemo: false,
  });

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const upcomingFixtures = fixtures
    .filter(
      (fixture) =>
        fixture.status !== "completed" &&
        new Date(fixture.kickoff).getTime() >= now,
    )
    .sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
    );

  const awaitingResults = fixtures
    .filter(
      (fixture) =>
        fixture.status !== "completed" &&
        new Date(fixture.kickoff).getTime() < now,
    )
    .sort(
      (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime(),
    );

  const completedFixtures = fixtures
    .filter((fixture) => fixture.status === "completed")
    .sort(
      (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime(),
    );

  return (
    <main className="page-width page-top section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark">ADMIN-SELECTED GAMES</p>
          <h1>Fixtures and results</h1>
        </div>

        <p>All times are shown in Trinidad and Tobago time.</p>
      </div>

      <div className="notice">
        Predictions lock automatically{" "}
        <strong>15 minutes before kickoff</strong>. Players may save or revise
        their scores before the cutoff.
      </div>

      <div className="fixture-page-actions">
        <Link className="button button-primary" href="/predictions">
          Enter my predictions
        </Link>

        <Link className="button button-secondary" href="/rules">
          View scoring rules
        </Link>
      </div>

      <section className="fixture-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">NEXT UP</p>
            <h2>Upcoming fixtures</h2>
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
            <h3>No upcoming fixtures</h3>
            <p>The administrator has not selected the next games yet.</p>
          </div>
        )}
      </section>

      {awaitingResults.length > 0 && (
        <section className="fixture-section awaiting-results-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">FINAL SCORE PENDING</p>
              <h2>Awaiting results</h2>
            </div>

            <span>
              {awaitingResults.length}{" "}
              {awaitingResults.length === 1 ? "game" : "games"}
            </span>
          </div>

          <div className="fixture-grid">
            {awaitingResults.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      )}

      <section className="fixture-section completed-fixtures-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">COMPLETED</p>
            <h2>Results</h2>
          </div>

          <span>
            {completedFixtures.length}{" "}
            {completedFixtures.length === 1 ? "result" : "results"}
          </span>
        </div>

        {completedFixtures.length > 0 ? (
          <div className="fixture-grid">
            {completedFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        ) : (
          <div className="content-card empty-state">
            <h3>No completed results</h3>
            <p>Completed match scores will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

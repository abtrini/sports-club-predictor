import Link from "next/link";
import { FixtureCard } from "@/components/FixtureCard";
import { StandingsTable } from "@/components/StandingsTable";
import { getFixtures, getStandings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [standings, fixtures] = await Promise.all([
    getStandings(),
    getFixtures(),
  ]);
  const nextFixtures = fixtures
    .filter((fixture) => fixture.status !== "completed")
    .slice(0, 2);
  const leader = standings[0];

  return (
    <>
      <section className="hero">
        <div className="page-width hero-grid">
          <div>
            <p className="eyebrow">2026/27 FRIENDLY PREDICTION LEAGUE</p>
            <h1>
              Every score counts.
              <br />
              Every point moves the table.
            </h1>
            <p className="hero-copy">
              Register, enter your score predictions, and track all 20
              participants as the table changes through the season.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/predictions">
                Enter predictions
              </Link>
              <Link className="button button-secondary" href="/register">
                Register as a player
              </Link>
            </div>
          </div>
          <div className="leader-card">
            <span>Current leader</span>
            <strong>{leader?.name ?? "No participants yet"}</strong>
            <b>{leader?.points ?? 0} pts</b>
            <small>{leader?.exactHits ?? 0} exact-score hits</small>
          </div>
        </div>
      </section>

      <section className="page-width section-block">
        {!isSupabaseConfigured() && (
          <div className="notice">
            <strong>Demo mode:</strong> sample data is being displayed. Connect
            Supabase using the included setup guide to save real participants
            and points.
          </div>
        )}
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">LIVE TABLE</p>
            <h2>Club standings</h2>
          </div>
          <p>Sorted by points, then exact scores, then correct outcomes.</p>
        </div>
        <StandingsTable standings={standings} />
      </section>

      <section className="page-width section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">NEXT UP</p>
            <h2>Selected fixtures</h2>
          </div>
          <Link href="/fixtures">See all fixtures →</Link>
        </div>
        <div className="fixture-grid">
          {nextFixtures.map((fixture) => (
            <FixtureCard key={fixture.id} fixture={fixture} />
          ))}
        </div>
      </section>
    </>
  );
}

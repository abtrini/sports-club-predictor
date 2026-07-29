import Link from "next/link";
import { StandingsTable } from "@/components/StandingsTable";
import { getStandings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const standings = await getStandings();

  const leader = standings[0];

  const totalExactScores = standings.reduce(
    (total, participant) => total + participant.exactHits,
    0,
  );

  const totalPoints = standings.reduce(
    (total, participant) => total + participant.points,
    0,
  );

  return (
    <main className="page-width standings-page">
      <header className="standings-page-header">
        <p className="eyebrow dark">2026/27 LEAGUE TABLE</p>

        <h1>Full standings</h1>

        <p className="standings-page-description">
          Follow all participants throughout the season. The top four positions
          are highlighted in green, while the bottom five positions are
          highlighted in red.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="notice">
          <strong>Demo mode:</strong> sample participants and points are being
          displayed.
        </div>
      )}

      <section className="standings-summary-grid" aria-label="League summary">
        <article className="standings-stat-card">
          <span>Participants</span>
          <strong>{standings.length}/20</strong>
          <small>Active league members</small>
        </article>

        <article className="standings-stat-card">
          <span>Current leader</span>
          <strong>{leader?.name ?? "No leader"}</strong>
          <small>{leader?.points ?? 0} points</small>
        </article>

        <article className="standings-stat-card">
          <span>Exact scores</span>
          <strong>{totalExactScores}</strong>
          <small>Across all participants</small>
        </article>

        <article className="standings-stat-card">
          <span>Total points</span>
          <strong>{totalPoints}</strong>
          <small>Awarded this season</small>
        </article>
      </section>

      <section className="standings-table-section">
        <StandingsTable standings={standings} />
      </section>

      <div className="standings-actions">
        <Link className="button button-primary" href="/predictions">
          Enter predictions
        </Link>

        <Link className="button button-secondary" href="/fixtures">
          View fixtures
        </Link>
      </div>
    </main>
  );
}

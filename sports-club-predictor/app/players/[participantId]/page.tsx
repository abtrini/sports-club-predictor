import Link from "next/link";
import { notFound } from "next/navigation";

import { getPlayerProfileStats } from "@/lib/player-stats";
import type { ScoreEventType } from "@/lib/types";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-TT", {
  dateStyle: "medium",
  timeZone: "America/Port_of_Spain",
});

function getResultLabel(eventType: ScoreEventType) {
  switch (eventType) {
    case "exact_score":
      return "Exact score";
    case "correct_winner":
    case "correct_outcome":
    case "winner_only":
      return "Correct winner";
    case "correct_draw":
      return "Correct draw";
    case "one_team_score":
      return "One team score";
    case "no_points":
      return "No points";
    case "manual_adjustment":
      return "Manual adjustment";
    default:
      return "Scored prediction";
  }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;
  const stats = await getPlayerProfileStats(participantId);

  if (!stats) notFound();

  const initials =
    stats.participant.shortName?.slice(0, 2) ||
    stats.participant.name.slice(0, 2);

  return (
    <main className="page-width page-top section-block">
      <section className="profile-hero">
        <div className="profile-identity">
          <span className="profile-avatar">{initials}</span>

          <div>
            <p className="eyebrow dark">PLAYER PROFILE</p>
            <h1>{stats.participant.name}</h1>
            <p>
              Joined{" "}
              {dateFormatter.format(
                new Date(stats.participant.joinedAt),
              )}
              {stats.participant.active
                ? " · Active participant"
                : " · Inactive participant"}
            </p>
          </div>
        </div>

        <div className="profile-rank-card">
          <span>Current rank</span>
          <strong>
            {stats.position ? `#${stats.position}` : "—"}
          </strong>
          <small>
            {stats.position
              ? `of ${stats.totalPlayers} active players`
              : "Not currently ranked"}
          </small>
        </div>
      </section>

      <div className="profile-page-actions">
        <Link
          className="button button-secondary"
          href="/players"
        >
          All player profiles
        </Link>

        <Link
          className="button button-secondary"
          href="/standings"
        >
          Full standings
        </Link>
      </div>

      <section className="profile-stats-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">SEASON SUMMARY</p>
            <h2>Performance statistics</h2>
          </div>
        </div>

        <div className="profile-stats-grid">
          <article className="profile-stat-card featured-profile-stat">
            <span>Total points</span>
            <strong>{stats.points}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Predictions scored</span>
            <strong>{stats.played}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Average points</span>
            <strong>{stats.averagePoints}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Exact scores</span>
            <strong>{stats.exactHits}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Correct winners</span>
            <strong>{stats.correctWinners}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Correct draws</span>
            <strong>{stats.correctDraws}</strong>
          </article>

          <article className="profile-stat-card">
            <span>One-team scores</span>
            <strong>{stats.oneTeamScores}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Zero-point results</span>
            <strong>{stats.noPointResults}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Longest scoring streak</span>
            <strong>{stats.longestScoringStreak}</strong>
          </article>

          <article className="profile-stat-card">
            <span>Best scoring week</span>
            <strong>{stats.bestWeekPoints} pts</strong>
            <small>{stats.bestWeekLabel ?? "No results yet"}</small>
          </article>
        </div>
      </section>

      <section className="profile-stats-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">RECENT FORM</p>
            <h2>Last five scored fixtures</h2>
            <p>
              Player predictions remain private. This public
              profile displays only aggregate statistics and
              completed scoring outcomes.
            </p>
          </div>
        </div>

        {stats.recentResults.length > 0 ? (
          <div className="recent-form-list">
            {stats.recentResults.map((result) => (
              <article
                className="recent-form-row"
                key={result.fixtureId}
              >
                <div className="recent-form-match">
                  <small>
                    {result.competition} ·{" "}
                    {dateFormatter.format(
                      new Date(result.kickoff),
                    )}
                  </small>

                  <strong>
                    {result.homeTeam}{" "}
                    {result.homeScore ?? "–"}–
                    {result.awayScore ?? "–"}{" "}
                    {result.awayTeam}
                  </strong>

                  <span>
                    {result.reason ||
                      getResultLabel(result.eventType)}
                  </span>
                </div>

                <b
                  className={`recent-form-points ${
                    result.points > 0
                      ? "recent-form-positive"
                      : "recent-form-zero"
                  }`}
                >
                  {result.points} {result.points === 1 ? "pt" : "pts"}
                </b>
              </article>
            ))}
          </div>
        ) : (
          <div className="content-card empty-state">
            <p>No completed scoring results are available yet.</p>
          </div>
        )}
      </section>

      {stats.manualAdjustmentPoints !== 0 && (
        <div className="notice">
          <strong>Manual adjustments:</strong>{" "}
          {stats.manualAdjustmentPoints > 0 ? "+" : ""}
          {stats.manualAdjustmentPoints} points are included in
          the total.
        </div>
      )}

      <div className="content-card profile-history-note">
        <h2>Rank movement</h2>
        <p>
          Current rank is shown above. Historical rank movement
          requires weekly standings snapshots, which are not yet
          stored in the database. This avoids displaying an
          invented or inaccurate movement figure.
        </p>
      </div>
    </main>
  );
}

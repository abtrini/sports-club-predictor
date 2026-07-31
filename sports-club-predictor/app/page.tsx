import Link from "next/link";

import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { FixtureCard } from "@/components/FixtureCard";
import { PlayerStatusPanel } from "@/components/PlayerStatusPanel";
import { StandingsTable } from "@/components/StandingsTable";
import { getCurrentUser } from "@/lib/auth";
import { getFixtures, getStandings } from "@/lib/data";
import { getPlayerDashboardStatus } from "@/lib/player-stats";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, standings, fixtures] = await Promise.all([
    getCurrentUser(),
    getStandings(),
    getFixtures(),
  ]);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const upcomingFixtures = fixtures
    .filter(
      (fixture) =>
        fixture.status !== "completed" &&
        new Date(fixture.kickoff).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff).getTime() -
        new Date(b.kickoff).getTime(),
    );

  const nextFixtures = upcomingFixtures.slice(0, 4);

  const nextOpenFixture = upcomingFixtures.find(
    (fixture) =>
      new Date(fixture.entryDeadline).getTime() > now,
  );

  const recentResults = fixtures
    .filter(
      (fixture) =>
        fixture.status === "completed" &&
        fixture.homeScore !== null &&
        fixture.awayScore !== null,
    )
    .sort(
      (a, b) =>
        new Date(b.kickoff).getTime() -
        new Date(a.kickoff).getTime(),
    )
    .slice(0, 4);

  const leader = standings[0];

  const participantPosition = user?.participantId
    ? standings.findIndex(
        (standing) => standing.id === user.participantId,
      ) + 1
    : 0;

  const participantStanding =
    participantPosition > 0
      ? standings[participantPosition - 1]
      : null;

  const playerStatus = user?.participantId
    ? await getPlayerDashboardStatus({
        participantId: user.participantId,
        fixtures,
        standings,
        now,
      })
    : null;

  return (
    <>
      <section className="hero">
        <div className="page-width hero-grid">
          <div>
            <p className="eyebrow">
              2026/27 FRIENDLY PREDICTION LEAGUE
            </p>

            <h1>
              Every score counts.
              <br />
              Every point moves the table.
            </h1>

            <p className="hero-copy">
              {user
                ? `Welcome back, ${user.fullName}. Check the next prediction deadline and keep your entries up to date.`
                : "Register, enter your score predictions, and track all 20 participants as the table changes through the season."}
            </p>

            <div className="hero-actions">
              {user ? (
                <>
                  {user.role === "admin" ? (
                    <Link
                      className="button button-primary"
                      href="/admin"
                    >
                      Open Admin Portal
                    </Link>
                  ) : (
                    <Link
                      className="button button-primary"
                      href="/predictions"
                    >
                      Enter predictions
                    </Link>
                  )}

                  <Link
                    className="button button-secondary"
                    href={
                      user.role === "admin"
                        ? "/predictions"
                        : "/fixtures"
                    }
                  >
                    {user.role === "admin"
                      ? "My predictions"
                      : "View fixtures"}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    className="button button-primary"
                    href="/register"
                  >
                    Register as a player
                  </Link>

                  <Link
                    className="button button-secondary"
                    href="/login"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="leader-card">
            {participantStanding ? (
              <>
                <span>Your current position</span>
                <strong>{participantStanding.name}</strong>
                <b>#{participantPosition}</b>
                <small>
                  {participantStanding.points} points ·{" "}
                  {participantStanding.exactHits} exact-score hits
                </small>
              </>
            ) : (
              <>
                <span>Current leader</span>
                <strong>
                  {leader?.name ?? "No participants yet"}
                </strong>
                <b>{leader?.points ?? 0} pts</b>
                <small>
                  {leader?.exactHits ?? 0} exact-score hits
                </small>
              </>
            )}
          </div>
        </div>
      </section>

      {!isSupabaseConfigured() && (
        <section className="page-width">
          <div className="notice">
            <strong>Demo mode:</strong> sample data is being
            displayed. Connect Supabase using the included setup
            guide to save real participants and points.
          </div>
        </section>
      )}

      {nextOpenFixture && (
        <section className="page-width deadline-section">
          <DeadlineCountdown
            deadline={nextOpenFixture.entryDeadline}
            homeTeam={nextOpenFixture.homeTeam}
            awayTeam={nextOpenFixture.awayTeam}
          />
        </section>
      )}

      {playerStatus && (
        <section className="page-width player-status-section">
          <PlayerStatusPanel status={playerStatus} />
        </section>
      )}

      <section className="page-width section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">
              NEXT SELECTED GAMES
            </p>
            <h2>Upcoming fixtures</h2>
            <p>
              The nearest scheduled games are shown first.
            </p>
          </div>

          <Link href="/fixtures">See all fixtures →</Link>
        </div>

        {nextFixtures.length > 0 ? (
          <div className="fixture-grid">
            {nextFixtures.map((fixture) => (
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
              />
            ))}
          </div>
        ) : (
          <div className="content-card empty-state">
            <h3>No upcoming fixtures</h3>
            <p>
              The administrator has not selected the next games
              yet.
            </p>
          </div>
        )}
      </section>

      <section className="page-width section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">
              LAST SELECTED FIXTURES
            </p>
            <h2>Recent results</h2>
            <p>
              The latest completed prediction fixtures are shown
              here.
            </p>
          </div>

          <Link href="/fixtures">View all results →</Link>
        </div>

        {recentResults.length > 0 ? (
          <div className="fixture-grid">
            {recentResults.map((fixture) => (
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
              />
            ))}
          </div>
        ) : (
          <div className="content-card empty-state">
            <h3>No completed results</h3>
            <p>
              Completed fixture scores will appear here after they
              are received from the API or entered by an
              administrator.
            </p>
          </div>
        )}
      </section>

      <section className="page-width section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">LIVE TABLE</p>
            <h2>Club standings</h2>
            <p>
              Select a participant&apos;s name to view their
              statistics profile.
            </p>
          </div>

          <div className="section-heading-actions">
            <Link href="/players">Player profiles →</Link>
            <Link href="/standings">
              View full standings →
            </Link>
          </div>
        </div>

        <StandingsTable standings={standings} />
      </section>
    </>
  );
}

import { redirect } from "next/navigation";

import { signOutAction } from "@/app/login/actions";
import { PlayerStatusPanel } from "@/components/PlayerStatusPanel";
import { PredictionCard } from "@/components/PredictionCard";
import { getCurrentUser } from "@/lib/auth";
import { getFixtures, getStandings } from "@/lib/data";
import { buildPlayerDashboardStatus } from "@/lib/player-stats";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Prediction, ScoreEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

type PredictionRow = {
  id: string;
  fixture_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  submitted_at: string;
  updated_at: string;
};

type ScoreEventRow = {
  fixture_id: string | null;
  points: number;
  event_type: ScoreEvent["eventType"];
  reason: string | null;
};

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <section className="page-width page-top section-block">
        <div className="content-card">
          <h1>Player accounts require Supabase</h1>
          <p>
            Configure the database using README.md to enable
            registration and predictions.
          </p>
        </div>
      </section>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(
      "/login?message=Sign%20in%20to%20enter%20your%20predictions.&next=%2Fpredictions",
    );
  }

  if (!user.participantId) {
    return (
      <section className="page-width narrow page-top section-block">
        <div className="content-card">
          <p className="eyebrow dark">PLAYER ACCOUNT</p>
          <h1>No participant is linked</h1>
          <p>
            Your account is signed in, but it is not connected
            to an active place in the 20-person table. Ask an
            administrator to link or add you.
          </p>

          <form action={signOutAction}>
            <button
              className="button button-secondary"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    );
  }

  const supabase = await createClient();

  const [
    fixtures,
    standings,
    predictionResponse,
    scoreResponse,
  ] = await Promise.all([
    getFixtures({ fallbackToDemo: false }),
    getStandings(),
    supabase
      .from("predictions")
      .select(
        `
          id,
          fixture_id,
          predicted_home_score,
          predicted_away_score,
          submitted_at,
          updated_at
        `,
      )
      .eq("participant_id", user.participantId),
    supabase
      .from("score_events")
      .select(
        `
          fixture_id,
          points,
          event_type,
          reason
        `,
      )
      .eq("participant_id", user.participantId)
      .not("fixture_id", "is", null),
  ]);

  if (predictionResponse.error) {
    throw new Error(predictionResponse.error.message);
  }

  if (scoreResponse.error) {
    throw new Error(scoreResponse.error.message);
  }

  const predictionRows =
    (predictionResponse.data ?? []) as PredictionRow[];

  const predictions: Prediction[] = predictionRows.map(
    (row) => ({
      id: row.id,
      fixtureId: row.fixture_id,
      predictedHomeScore: row.predicted_home_score,
      predictedAwayScore: row.predicted_away_score,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
    }),
  );

  const scoreRows =
    (scoreResponse.data ?? []) as ScoreEventRow[];

  const scoreEvents: ScoreEvent[] = scoreRows
    .filter(
      (
        row,
      ): row is ScoreEventRow & { fixture_id: string } =>
        Boolean(row.fixture_id),
    )
    .map((row) => ({
      fixtureId: row.fixture_id,
      points: row.points,
      eventType: row.event_type,
      reason: row.reason,
    }));

  const predictionByFixture = new Map(
    predictions.map((prediction) => [
      prediction.fixtureId,
      prediction,
    ]),
  );

  const scoreByFixture = new Map(
    scoreEvents.map((event) => [
      event.fixtureId,
      event,
    ]),
  );

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const openFixtures = fixtures
    .filter(
      (fixture) =>
        fixture.status !== "completed" &&
        (fixture.status === "scheduled" ||
          fixture.status === "open") &&
        new Date(fixture.entryDeadline).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.entryDeadline).getTime() -
        new Date(b.entryDeadline).getTime(),
    );

  const openFixtureIds = new Set(
    openFixtures.map((fixture) => fixture.id),
  );

  const lockedFixtures = fixtures
    .filter(
      (fixture) =>
        fixture.status !== "completed" &&
        !openFixtureIds.has(fixture.id),
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff).getTime() -
        new Date(b.kickoff).getTime(),
    );

  const completedFixtures = fixtures
    .filter((fixture) => fixture.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.kickoff).getTime() -
        new Date(a.kickoff).getTime(),
    );

  const dashboardStatus = buildPlayerDashboardStatus({
    participantId: user.participantId,
    predictedFixtureIds: predictions.map(
      (prediction) => prediction.fixtureId,
    ),
    fixtures,
    standings,
    now,
  });

  return (
    <section className="page-width page-top section-block">
      <div className="admin-heading">
        <div>
          <p className="eyebrow dark">MY PREDICTIONS</p>
          <h1>Welcome, {user.fullName}</h1>
          <p>
            Enter or revise each score before its automatic
            cutoff. Completed games show your locked
            prediction, the final score and points earned.
          </p>
        </div>

        <form action={signOutAction}>
          <button
            className="button button-secondary"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>

      {message && (
        <div className="form-message success-message">
          {message}
        </div>
      )}

      <PlayerStatusPanel status={dashboardStatus} />

      <div className="notice">
        <strong>Automatic lock:</strong> every prediction
        closes exactly 15 minutes before kickoff. Late entries
        are rejected by the database.
      </div>

      <section className="prediction-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">
              ACTION REQUIRED
            </p>
            <h2>Upcoming predictions</h2>
          </div>

          <span>
            {openFixtures.length}{" "}
            {openFixtures.length === 1 ? "game" : "games"} open
          </span>
        </div>

        {openFixtures.length > 0 ? (
          <div className="prediction-grid">
            {openFixtures.map((fixture) => (
              <PredictionCard
                key={fixture.id}
                fixture={fixture}
                prediction={predictionByFixture.get(
                  fixture.id,
                )}
                scoreEvent={scoreByFixture.get(fixture.id)}
              />
            ))}
          </div>
        ) : (
          <div className="content-card empty-state">
            <p>No predictions are currently open.</p>
          </div>
        )}
      </section>

      {lockedFixtures.length > 0 && (
        <section className="prediction-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">LOCKED</p>
              <h2>Awaiting final results</h2>
            </div>

            <span>
              {lockedFixtures.length}{" "}
              {lockedFixtures.length === 1
                ? "game"
                : "games"}
            </span>
          </div>

          <div className="prediction-grid">
            {lockedFixtures.map((fixture) => (
              <PredictionCard
                key={fixture.id}
                fixture={fixture}
                prediction={predictionByFixture.get(
                  fixture.id,
                )}
                scoreEvent={scoreByFixture.get(fixture.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="prediction-section completed-predictions-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">COMPLETED</p>
            <h2>Prediction results</h2>
          </div>

          <span>
            {completedFixtures.length}{" "}
            {completedFixtures.length === 1
              ? "result"
              : "results"}
          </span>
        </div>

        {completedFixtures.length > 0 ? (
          <div className="prediction-grid">
            {completedFixtures.map((fixture) => (
              <PredictionCard
                key={fixture.id}
                fixture={fixture}
                prediction={predictionByFixture.get(
                  fixture.id,
                )}
                scoreEvent={scoreByFixture.get(fixture.id)}
              />
            ))}
          </div>
        ) : (
          <div className="content-card empty-state">
            <p>No completed predictions yet.</p>
          </div>
        )}
      </section>
    </section>
  );
}

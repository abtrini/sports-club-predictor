import { redirect } from "next/navigation";
import { PredictionCard } from "@/components/PredictionCard";
import { getCurrentUser } from "@/lib/auth";
import { getFixtures } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Prediction } from "@/lib/types";
import { signOutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

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
            Configure the database using README.md to enable registration and
            predictions.
          </p>
        </div>
      </section>
    );
  }

  const user = await getCurrentUser();
  if (!user)
    redirect(
      "/login?message=Sign%20in%20to%20enter%20your%20predictions.&next=%2Fpredictions",
    );

  if (!user.participantId) {
    return (
      <section className="page-width narrow page-top section-block">
        <div className="content-card">
          <p className="eyebrow dark">PLAYER ACCOUNT</p>
          <h1>No participant is linked</h1>
          <p>
            Your account is signed in, but it is not connected to an active
            place in the 20-person table. Ask an administrator to link or add
            you.
          </p>
          <form action={signOutAction}>
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    );
  }

  const supabase = await createClient();
  const [fixtures, { data: predictionRows }] = await Promise.all([
    getFixtures({ fallbackToDemo: false }),
    supabase
      .from("predictions")
      .select(
        "id, fixture_id, predicted_home_score, predicted_away_score, submitted_at, updated_at",
      )
      .eq("participant_id", user.participantId),
  ]);

  const rows = (predictionRows ?? []) as Array<{
    id: string;
    fixture_id: string;
    predicted_home_score: number;
    predicted_away_score: number;
    submitted_at: string;
    updated_at: string;
  }>;

  const predictions: Prediction[] = rows.map((row) => ({
    id: row.id,
    fixtureId: row.fixture_id,
    predictedHomeScore: row.predicted_home_score,
    predictedAwayScore: row.predicted_away_score,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  }));

  const predictionByFixture = new Map(
    predictions.map((prediction) => [prediction.fixtureId, prediction]),
  );

  return (
    <section className="page-width page-top section-block">
      <div className="admin-heading">
        <div>
          <p className="eyebrow dark">MY PREDICTIONS</p>
          <h1>Welcome, {user.fullName}</h1>
          <p>Enter or revise each score before its automatic cutoff.</p>
        </div>
        <form action={signOutAction}>
          <button className="button button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>

      {message && <div className="form-message success-message">{message}</div>}
      <div className="notice">
        <strong>Automatic lock:</strong> every prediction closes exactly 15
        minutes before kickoff. Late entries are rejected by the database.
      </div>

      <div className="prediction-grid">
        {fixtures.length > 0 ? (
          fixtures.map((fixture) => (
            <PredictionCard
              key={fixture.id}
              fixture={fixture}
              prediction={predictionByFixture.get(fixture.id)}
            />
          ))
        ) : (
          <div className="content-card">
            <p>No fixtures have been selected yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}

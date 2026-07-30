import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/login/actions";
import { getAdminUser } from "@/lib/auth";
import { getFixtures, getRules } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  addFixtureAction,
  addParticipantAction,
  addPointsAction,
  syncOfficialResultsAction,
  updateFixtureAction,
  updateRulesAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <section className="page-width page-top section-block">
        <div className="content-card">
          <h1>Admin setup required</h1>
          <p>
            The public site is in demo mode. Configure Supabase and create the
            first administrator using the setup guide.
          </p>
        </div>
      </section>
    );
  }

  const admin = await getAdminUser();

  if (!admin) {
    redirect("/login?message=Administrator%20access%20required.&next=%2Fadmin");
  }

  const supabase = await createClient();

  const [{ data: participants }, fixtures, rules] = await Promise.all([
    supabase
      .from("participants")
      .select("id, name")
      .eq("active", true)
      .order("name"),
    getFixtures({ fallbackToDemo: false }),
    getRules(),
  ]);

  const participantList = (participants ?? []) as Array<{
    id: string;
    name: string;
  }>;

  const manualFixtures = fixtures.filter(
    (fixture) => (fixture.dataSource ?? "manual") === "manual",
  );

  const officialFixtures = fixtures.filter(
    (fixture) => fixture.dataSource === "football-data",
  );

  const pendingOfficial = officialFixtures.filter(
    (fixture) => fixture.status !== "completed",
  ).length;

  return (
    <section className="page-width page-top section-block">
      <div className="admin-heading">
        <div>
          <p className="eyebrow dark">CONTROL CENTRE</p>
          <h1>Admin dashboard</h1>
          <p>
            Signed in as {admin.fullName} · {participantList.length}/20 players
          </p>
        </div>

        <div className="admin-heading-actions">
          <Link className="button button-primary" href="/admin/import-fixtures">
            Import official fixtures
          </Link>

          <Link className="button button-secondary" href="/admin/players">
            Manage players
          </Link>

          <form action={signOutAction}>
            <button className="button button-secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {message && <div className="form-message success-message">{message}</div>}

      <div className="automation-notice automation-notice-success">
        <strong>Automatic scoring is active.</strong>
        <span>
          Exact-score, correct-winner, correct-draw and one-team-score points
          are calculated automatically whenever a completed result is saved.
          Only the highest applicable award is given.
        </span>
      </div>

      <div className="admin-source-summary">
        <article className="admin-source-card official-source-card">
          <span>Official/API fixtures</span>
          <strong>{officialFixtures.length}</strong>
          <small>{pendingOfficial} waiting for a final API result</small>
        </article>

        <article className="admin-source-card manual-source-card">
          <span>Manual fixtures</span>
          <strong>{manualFixtures.length}</strong>
          <small>Admin enters only the final score</small>
        </article>
      </div>

      <div className="admin-grid">
        <article className="content-card official-results-card">
          <p className="eyebrow dark">OFFICIAL RESULTS</p>
          <h2>Sync API scores</h2>
          <p className="card-helper">
            Imported fixtures remain separate from manually entered fixtures.
            Finished scores are pulled from football-data.org and player points
            are recalculated automatically.
          </p>

          <form action={syncOfficialResultsAction}>
            <button className="button button-primary" type="submit">
              Sync official results now
            </button>
          </form>

          <p className="admin-callout-small">
            The scheduled GitHub Action will also run this sync automatically.
          </p>
        </article>

        <article id="add-participant" className="content-card">
          <h2>Add participant</h2>
          <p className="card-helper">
            Pre-add a player to the table. When they register with the same full
            name, their account is linked automatically.
          </p>

          <form action={addParticipantAction} className="stack-form">
            <label>
              Full name
              <input name="name" required placeholder="e.g. Anthony Bobb" />
            </label>

            <label>
              Initials or short name
              <input name="shortName" maxLength={4} placeholder="AB" />
            </label>

            <button className="button button-primary" type="submit">
              Add participant
            </button>
          </form>
        </article>

        <article className="content-card manual-fixture-card">
          <p className="eyebrow dark">MANUAL GAME</p>
          <h2>Add game not available in the API</h2>
          <p className="card-helper">
            Use this only when the game does not appear in the official fixture
            importer. The prediction cutoff remains automatic.
          </p>

          <form action={addFixtureAction} className="stack-form">
            <label>
              Competition
              <input name="competition" required placeholder="Club friendly" />
            </label>

            <div className="two-column-fields">
              <label>
                Home team
                <input name="homeTeam" required />
              </label>

              <label>
                Away team
                <input name="awayTeam" required />
              </label>
            </div>

            <label>
              Kickoff (Trinidad time)
              <input name="kickoff" type="datetime-local" required />
            </label>

            <button className="button button-primary" type="submit">
              Add manual fixture
            </button>
          </form>
        </article>

        <article className="content-card manual-result-card">
          <p className="eyebrow dark">MANUAL RESULT</p>
          <h2>Enter final score</h2>
          <p className="card-helper">
            Only manually created fixtures appear here. After the game is marked
            completed, points are calculated automatically.
          </p>

          {manualFixtures.length > 0 ? (
            <form action={updateFixtureAction} className="stack-form">
              <label>
                Manual fixture
                <select name="fixtureId" required defaultValue="">
                  <option value="" disabled>
                    Select manual fixture
                  </option>

                  {manualFixtures.map((fixture) => (
                    <option key={fixture.id} value={fixture.id}>
                      {fixture.competition} — {fixture.homeTeam} vs{" "}
                      {fixture.awayTeam}
                    </option>
                  ))}
                </select>
              </label>

              <input name="status" type="hidden" value="completed" />

              <div className="two-column-fields">
                <label>
                  Home score
                  <input name="homeScore" type="number" min="0" required />
                </label>

                <label>
                  Away score
                  <input name="awayScore" type="number" min="0" required />
                </label>
              </div>

              <button className="button button-primary" type="submit">
                Save result and calculate points
              </button>
            </form>
          ) : (
            <div className="admin-empty-state">
              No manual fixtures have been created.
            </div>
          )}
        </article>

        <article className="content-card warning-adjustment-card">
          <p className="eyebrow dark">EXCEPTION ONLY</p>
          <h2>Manual points adjustment</h2>
          <p className="card-helper">
            Do not use this for normal match scoring. Use it only for an agreed
            bonus, deduction or correction that the automatic rules cannot
            represent.
          </p>

          <form action={addPointsAction} className="stack-form">
            <label>
              Participant
              <select name="participantId" required defaultValue="">
                <option value="" disabled>
                  Select participant
                </option>

                {participantList.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Points adjustment
              <input
                name="points"
                type="number"
                min="-10"
                max="10"
                defaultValue="0"
                required
              />
            </label>

            <label>
              Required reason
              <input
                name="reason"
                required
                placeholder="e.g. Committee-approved one-point deduction"
              />
            </label>

            <button className="button button-warning" type="submit">
              Apply manual adjustment
            </button>
          </form>
        </article>

        <article className="content-card rules-card">
          <p className="eyebrow dark">POINTS SETTINGS</p>
          <h2>Scoring rules</h2>
          <p className="card-helper">
            Saving these values automatically recalculates every completed game.
            Awards do not stack; each prediction receives only the highest
            scoring condition it satisfies.
          </p>

          <form action={updateRulesAction} className="stack-form">
            <div className="four-column-fields">
              <label>
                Exact score
                <input
                  name="exactScorePoints"
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={rules.exactScorePoints}
                  required
                />
              </label>

              <label>
                Correct winner
                <input
                  name="correctWinnerPoints"
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={rules.correctWinnerPoints}
                  required
                />
              </label>

              <label>
                Correct draw
                <input
                  name="correctDrawPoints"
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={rules.correctDrawPoints}
                  required
                />
              </label>

              <label>
                One team score
                <input
                  name="oneTeamScorePoints"
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={rules.oneTeamScorePoints}
                  required
                />
              </label>
            </div>

            <div className="notice">
              <strong>Recommended values:</strong> exact score 3, correct winner
              2, correct draw 1, and one team score 1.
            </div>

            <label>
              Knockout/penalty score basis
              <select name="penaltyMode" defaultValue={rules.penaltyMode}>
                <option value="pending">
                  Pending decision — default to 90 minutes
                </option>
                <option value="ninety_minutes">Score after 90 minutes</option>
                <option value="after_extra_time">Score after extra time</option>
                <option value="after_penalties">Score after penalties</option>
              </select>
            </label>

            <label>
              Entry note
              <textarea
                name="entryNotes"
                rows={4}
                defaultValue={rules.entryNotes}
              />
            </label>

            <button className="button button-primary" type="submit">
              Save rules and recalculate
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}

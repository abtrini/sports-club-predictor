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
          <p>The public site is in demo mode. Configure Supabase and create the first admin using README.md.</p>
        </div>
      </section>
    );
  }

  const admin = await getAdminUser();
  if (!admin) redirect("/login?message=Administrator%20access%20required.&next=%2Fadmin");

  const supabase = await createClient();
  const [{ data: participants }, fixtures, rules] = await Promise.all([
    supabase.from("participants").select("id, name").eq("active", true).order("name"),
    getFixtures({ fallbackToDemo: false }),
    getRules(),
  ]);


  const participantList = (participants ?? []) as Array<{ id: string; name: string }>;

  return (
    <section className="page-width page-top section-block">
      <div className="admin-heading">
        <div>
          <p className="eyebrow dark">CONTROL CENTRE</p>
          <h1>Admin dashboard</h1>
          <p>Signed in as {admin.fullName} · {participantList.length}/20 players</p>
        </div>
        <form action={signOutAction}><button className="button button-secondary" type="submit">Sign out</button></form>
      </div>
      {message && <div className="form-message success-message">{message}</div>}

      <div className="admin-grid">
        <article className="content-card">
          <h2>Add participant</h2>
          <p className="card-helper">Pre-add a player to the table. When they register with the same full name, their account is linked automatically.</p>
          <form action={addParticipantAction} className="stack-form">
            <label>Full name<input name="name" required placeholder="e.g. Anthony Bobb" /></label>
            <label>Initials or short name<input name="shortName" maxLength={4} placeholder="AB" /></label>
            <button className="button button-primary" type="submit">Add participant</button>
          </form>
        </article>

        <article className="content-card">
          <h2>Add selected fixture</h2>
          <p className="card-helper">The system calculates the cutoff automatically as kickoff minus 15 minutes.</p>
          <form action={addFixtureAction} className="stack-form">
            <label>Competition<input name="competition" required placeholder="Premier League" /></label>
            <div className="two-column-fields">
              <label>Home team<input name="homeTeam" required /></label>
              <label>Away team<input name="awayTeam" required /></label>
            </div>
            <label>Kickoff (Trinidad time)<input name="kickoff" type="datetime-local" required /></label>
            <button className="button button-primary" type="submit">Add fixture</button>
          </form>
        </article>

        <article className="content-card">
          <h2>Enter points</h2>
          <form action={addPointsAction} className="stack-form">
            <label>Participant
              <select name="participantId" required defaultValue="">
                <option value="" disabled>Select participant</option>
                {participantList.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
              </select>
            </label>
            <label>Fixture (optional)
              <select name="fixtureId" defaultValue="">
                <option value="">General/manual adjustment</option>
                {fixtures.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.homeTeam} vs {fixture.awayTeam}</option>)}
              </select>
            </label>
            <div className="two-column-fields">
              <label>Type
                <select name="eventType" defaultValue="exact_score">
                  <option value="exact_score">Exact score</option>
                  <option value="correct_outcome">Correct outcome</option>
                  <option value="winner_only">Outright winner</option>
                  <option value="manual_adjustment">Manual adjustment</option>
                </select>
              </label>
              <label>Points<input name="points" type="number" min="-10" max="10" defaultValue="3" required /></label>
            </div>
            <label>Reason<input name="reason" placeholder="e.g. Correct 2–1 score" /></label>
            <button className="button button-primary" type="submit">Add points</button>
          </form>
        </article>

        <article className="content-card">
          <h2>Update fixture/result</h2>
          <form action={updateFixtureAction} className="stack-form">
            <label>Fixture
              <select name="fixtureId" required defaultValue="">
                <option value="" disabled>Select fixture</option>
                {fixtures.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.homeTeam} vs {fixture.awayTeam}</option>)}
              </select>
            </label>
            <label>Status
              <select name="status" defaultValue="open">
                <option value="scheduled">Scheduled</option>
                <option value="open">Open for entries</option>
                <option value="closed">Entries closed manually</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <div className="two-column-fields">
              <label>Home score<input name="homeScore" type="number" min="0" /></label>
              <label>Away score<input name="awayScore" type="number" min="0" /></label>
            </div>
            <button className="button button-primary" type="submit">Update fixture</button>
          </form>
        </article>

        <article className="content-card">
          <h2>Update rules</h2>
          <form action={updateRulesAction} className="stack-form">
            <div className="three-column-fields">
              <label>Exact<input name="exactScorePoints" type="number" defaultValue={rules.exactScorePoints} /></label>
              <label>Outcome<input name="correctOutcomePoints" type="number" defaultValue={rules.correctOutcomePoints} /></label>
              <label>Winner<input name="winnerOnlyPoints" type="number" defaultValue={rules.winnerOnlyPoints} /></label>
            </div>
            <label>Penalty rule
              <select name="penaltyMode" defaultValue={rules.penaltyMode}>
                <option value="pending">Pending decision</option>
                <option value="ninety_minutes">Score after 90 minutes</option>
                <option value="after_extra_time">Score after extra time</option>
                <option value="after_penalties">Winner after penalties</option>
              </select>
            </label>
            <label>Entry note<textarea name="entryNotes" rows={4} defaultValue={rules.entryNotes} /></label>
            <button className="button button-primary" type="submit">Save rules</button>
          </form>
        </article>
      </div>
    </section>
  );
}

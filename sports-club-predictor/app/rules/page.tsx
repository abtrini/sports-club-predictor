import { getRules } from "@/lib/data";

const penaltyLabels = {
  pending: "Pending club decision",
  ninety_minutes: "Use the result after 90 minutes",
  after_extra_time: "Use the result after extra time",
  after_penalties: "Use the winner after penalties",
};

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await getRules();

  return (
    <section className="page-width page-top section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark">RULES AND REGULATIONS</p>
          <h1>How points are awarded</h1>
        </div>
        <p>The administrators should publish any rule change before entries open.</p>
      </div>

      <div className="rules-grid">
        <article className="rule-card featured-rule">
          <span className="rule-number">{rules.exactScorePoints}</span>
          <h2>Exact score</h2>
          <p>Predict both teams’ final scores correctly.</p>
        </article>
        <article className="rule-card">
          <span className="rule-number">{rules.correctOutcomePoints}</span>
          <h2>Correct outcome</h2>
          <p>Correctly predict home win, draw or away win, but not the exact score.</p>
        </article>
        <article className="rule-card">
          <span className="rule-number">0</span>
          <h2>Incorrect outcome</h2>
          <p>No points when the match outcome is incorrect.</p>
        </article>
      </div>

      <div className="content-card prose">
        <h2>Current working rules</h2>
        <ol>
          <li>Administrators choose the matches included in the competition.</li>
          <li>The group should be notified approximately one week before each selected match.</li>
          <li>Players must register and sign in using their personal account.</li>
          <li>Predictions may be entered or revised until exactly 15 minutes before kickoff.</li>
          <li>The database rejects any new or changed prediction after the cutoff.</li>
          <li>The table ranks participants by total points, exact-score hits, correct outcomes, then name.</li>
          <li>The top four positions are highlighted as the promoted/championship zone.</li>
          <li>The bottom five positions are highlighted as the relegation zone.</li>
        </ol>
        <h3>Knockout matches and penalties</h3>
        <p><strong>Current setting:</strong> {penaltyLabels[rules.penaltyMode]}.</p>
        <p>
          Suggested final rule: score predictions should normally use the score after 90 minutes. A separate “outright winner” selection can be used for knockout games and awarded {rules.winnerOnlyPoints} point.
        </p>
        <h3>Entry note</h3>
        <p>{rules.entryNotes}</p>
      </div>
    </section>
  );
}

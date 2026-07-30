import Link from "next/link";

import { getRules } from "@/lib/data";
import type { ClubRules } from "@/lib/types";

export const dynamic = "force-dynamic";

const penaltyLabels: Record<ClubRules["penaltyMode"], string> = {
  pending: "Pending club decision",
  ninety_minutes: "Use the result after 90 minutes",
  after_extra_time: "Use the result after extra time",
  after_penalties: "Use the winner after penalties",
};

export default async function RulesPage() {
  const rules = await getRules();

  return (
    <main className="page-width page-top section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark">RULES AND REGULATIONS</p>
          <h1>How prediction points are awarded</h1>
        </div>

        <p>
          Each prediction receives only the highest-value scoring condition it
          satisfies.
        </p>
      </div>

      <div className="rules-grid scoring-rule-grid">
        <article className="rule-card featured-rule">
          <span className="rule-number">{rules.exactScorePoints}</span>

          <h2>Exact score</h2>

          <p>Both teams&apos; final scores are predicted correctly.</p>
        </article>

        <article className="rule-card">
          <span className="rule-number">{rules.correctWinnerPoints}</span>

          <h2>Correct winner</h2>

          <p>The winning team is correct, but the score is not exact.</p>
        </article>

        <article className="rule-card">
          <span className="rule-number">{rules.correctDrawPoints}</span>

          <h2>Correct draw</h2>

          <p>A draw is correctly predicted, but the draw score is not exact.</p>
        </article>

        <article className="rule-card">
          <span className="rule-number">{rules.oneTeamScorePoints}</span>

          <h2>One team score</h2>

          <p>
            One team&apos;s score is predicted exactly when no higher scoring
            condition applies.
          </p>
        </article>
      </div>

      <div className="notice">
        <strong>Highest award only:</strong> points do not stack. For example,
        an exact score earns {rules.exactScorePoints} points in total—not extra
        points from the other conditions.
      </div>

      <div className="content-card prose">
        <h2>Scoring examples</h2>

        <p>
          Assume the final result is <strong>Home 2–1 Away</strong>.
        </p>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Prediction</th>
                <th scope="col">Reason</th>
                <th scope="col">Points</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>2–1</td>
                <td>Exact score</td>
                <td>{rules.exactScorePoints}</td>
              </tr>

              <tr>
                <td>3–1</td>
                <td>Correct winning team</td>
                <td>{rules.correctWinnerPoints}</td>
              </tr>

              <tr>
                <td>2–3</td>
                <td>Home score correct, but outcome incorrect</td>
                <td>{rules.oneTeamScorePoints}</td>
              </tr>

              <tr>
                <td>0–1</td>
                <td>No scoring condition matched</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          For a final result of <strong>Home 2–2 Away</strong>, a prediction of
          1–1 earns {rules.correctDrawPoints} point for correctly predicting a
          draw. A prediction of 2–2 earns {rules.exactScorePoints} points
          because the exact-score award takes priority.
        </p>
      </div>

      <div className="content-card prose">
        <h2>Competition rules</h2>

        <ol>
          <li>
            Administrators choose the matches included in the competition.
          </li>

          <li>
            Players must register and sign in using their personal account.
          </li>

          <li>
            Predictions may be entered or revised until exactly 15 minutes
            before kickoff.
          </li>

          <li>
            The database rejects new or changed predictions after the cutoff.
          </li>

          <li>
            When an official API fixture is completed, its final score is
            synchronized and points are calculated automatically.
          </li>

          <li>
            Manually created fixtures are scored automatically after an
            administrator enters the final score.
          </li>

          <li>
            The standings rank participants by total points, followed by the
            configured tie-breaking rules.
          </li>

          <li>
            The top four positions are highlighted as the championship zone.
          </li>

          <li>
            The bottom five positions are highlighted as the relegation zone.
          </li>
        </ol>

        <h3>Knockout matches and penalties</h3>

        <p>
          <strong>Current setting:</strong> {penaltyLabels[rules.penaltyMode]}.
        </p>

        <p>
          A separate outright-winner selection may be used for knockout games
          and awarded {rules.winnerOnlyPoints}{" "}
          {rules.winnerOnlyPoints === 1 ? "point" : "points"}.
        </p>

        <h3>Entry note</h3>

        <p>{rules.entryNotes}</p>
      </div>

      <div className="page-actions">
        <Link className="button button-primary" href="/predictions">
          Enter my predictions
        </Link>

        <Link className="button button-secondary" href="/fixtures">
          View fixtures
        </Link>
      </div>
    </main>
  );
}

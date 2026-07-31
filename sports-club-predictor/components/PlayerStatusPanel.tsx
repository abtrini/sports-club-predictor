import Link from "next/link";

import type { PlayerDashboardStatus } from "@/lib/types";

const cutoffFormatter = new Intl.DateTimeFormat("en-TT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Port_of_Spain",
});

export function PlayerStatusPanel({
  status,
}: {
  status: PlayerDashboardStatus;
}) {
  const needsPredictions = status.missingCount > 0;

  return (
    <section
      className={`player-status-panel ${
        needsPredictions
          ? "player-status-attention"
          : "player-status-complete"
      }`}
      aria-labelledby="prediction-status-heading"
    >
      <div className="player-status-heading">
        <div>
          <p className="eyebrow dark">MY PREDICTION STATUS</p>
          <h2 id="prediction-status-heading">
            {needsPredictions
              ? `${status.missingCount} prediction${
                  status.missingCount === 1 ? "" : "s"
                } still to submit`
              : status.openFixtureCount > 0
                ? "All open predictions submitted"
                : "No predictions currently open"}
          </h2>

          <p>
            {status.nextFixtureLabel && status.nextCutoff
              ? `Next cutoff: ${status.nextFixtureLabel} · ${cutoffFormatter.format(
                  new Date(status.nextCutoff),
                )}`
              : "The next selected fixtures will appear here when entries open."}
          </p>
        </div>

        <div className="player-status-actions">
          <Link
            className="button button-primary"
            href="/predictions"
          >
            {needsPredictions
              ? "Complete predictions"
              : "Review predictions"}
          </Link>

          <Link
            className="button button-secondary"
            href={`/players/${status.participantId}`}
          >
            View my statistics
          </Link>
        </div>
      </div>

      <div className="player-status-metrics">
        <div>
          <span>Submitted</span>
          <strong>
            {status.submittedCount}/{status.openFixtureCount}
          </strong>
        </div>

        <div>
          <span>Missing</span>
          <strong>{status.missingCount}</strong>
        </div>

        <div>
          <span>Current position</span>
          <strong>
            {status.position ? `#${status.position}` : "—"}
          </strong>
        </div>

        <div>
          <span>Total points</span>
          <strong>{status.points}</strong>
        </div>
      </div>

      <div
        className="prediction-completion-track"
        aria-label={`${status.completionPercent}% of open predictions submitted`}
      >
        <span
          style={{ width: `${status.completionPercent}%` }}
        />
      </div>
    </section>
  );
}

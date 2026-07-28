"use client";

import { useEffect, useState } from "react";
import type { Fixture } from "@/lib/types";

const formatter = new Intl.DateTimeFormat("en-TT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Port_of_Spain",
});

export function FixtureCard({ fixture }: { fixture: Fixture }) {
  const hasResult = fixture.homeScore !== null && fixture.awayScore !== null;

  const [cutoffPassed, setCutoffPassed] = useState(false);

  useEffect(() => {
    const checkCutoff = () => {
      const deadline = new Date(fixture.entryDeadline).getTime();
      setCutoffPassed(Date.now() >= deadline);
    };

    // Check immediately when the card loads.
    checkCutoff();

    // Check again every 30 seconds.
    const intervalId = window.setInterval(checkCutoff, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fixture.entryDeadline]);

  const effectiveStatus =
    cutoffPassed && fixture.status !== "completed" ? "closed" : fixture.status;
  return (
    <article className="fixture-card">
      <div className="fixture-topline">
        <span>{fixture.competition}</span>
        <span className={`status status-${effectiveStatus}`}>
          {effectiveStatus}
        </span>
      </div>
      <div className="fixture-teams">
        <strong>{fixture.homeTeam}</strong>
        <span className="score">
          {hasResult ? `${fixture.homeScore} – ${fixture.awayScore}` : "vs"}
        </span>
        <strong>{fixture.awayTeam}</strong>
      </div>
      <dl className="fixture-meta">
        <div>
          <dt>Kickoff</dt>
          <dd>{formatter.format(new Date(fixture.kickoff))}</dd>
        </div>
        <div>
          <dt>Prediction cutoff</dt>
          <dd>{formatter.format(new Date(fixture.entryDeadline))}</dd>
        </div>
      </dl>
    </article>
  );
}

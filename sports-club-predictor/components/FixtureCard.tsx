"use client";

import { useEffect, useState } from "react";

import { TeamCrest } from "@/components/TeamCrest";
import { getCompetitionTheme } from "@/lib/competition-theme";
import type { Fixture } from "@/lib/types";

const formatter = new Intl.DateTimeFormat("en-TT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Port_of_Spain",
});

export function FixtureCard({ fixture }: { fixture: Fixture }) {
  const [cutoffPassed, setCutoffPassed] = useState(false);

  const hasResult = fixture.homeScore !== null && fixture.awayScore !== null;

  const competitionTheme = getCompetitionTheme(fixture.competition);

  const sourceLabel =
    fixture.dataSource === "football-data"
      ? "Official/API"
      : fixture.dataSource === "manual"
        ? "Manual"
        : null;

  useEffect(() => {
    const checkCutoff = () => {
      const deadline = new Date(fixture.entryDeadline).getTime();

      setCutoffPassed(Date.now() >= deadline);
    };

    checkCutoff();

    const intervalId = window.setInterval(checkCutoff, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fixture.entryDeadline]);

  const effectiveStatus =
    cutoffPassed && fixture.status !== "completed" ? "closed" : fixture.status;

  return (
    <article className={`fixture-card league-card ${competitionTheme}`}>
      <div className="fixture-topline">
        <div className="fixture-label-group">
          <span className="competition-badge">{fixture.competition}</span>

          {sourceLabel && (
            <span
              className={`source-badge ${
                fixture.dataSource === "football-data"
                  ? "source-api"
                  : "source-manual"
              }`}
            >
              {sourceLabel}
            </span>
          )}
        </div>

        <span className={`status status-${effectiveStatus}`}>
          {effectiveStatus}
        </span>
      </div>

      <div className="fixture-teams fixture-teams-with-crests">
        <div className="fixture-team fixture-team-home">
          <TeamCrest
            teamName={fixture.homeTeam}
            crestUrl={fixture.homeTeamCrest}
            size={52}
          />

          <strong>{fixture.homeTeam}</strong>
        </div>

        <span className="score">
          {hasResult ? `${fixture.homeScore} – ${fixture.awayScore}` : "vs"}
        </span>

        <div className="fixture-team fixture-team-away">
          <TeamCrest
            teamName={fixture.awayTeam}
            crestUrl={fixture.awayTeamCrest}
            size={52}
          />

          <strong>{fixture.awayTeam}</strong>
        </div>
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

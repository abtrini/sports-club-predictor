"use client";

import { useEffect, useMemo, useState } from "react";

import { savePredictionAction } from "@/app/predictions/actions";
import type { Fixture, Prediction, ScoreEvent } from "@/lib/types";

const formatter = new Intl.DateTimeFormat("en-TT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Port_of_Spain",
});

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) {
    return "Closed";
  }

  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${Math.max(1, minutes)}m remaining`;
}

export function PredictionCard({
  fixture,
  prediction,
  scoreEvent,
}: {
  fixture: Fixture;
  prediction?: Prediction;
  scoreEvent?: ScoreEvent;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setNow(Date.now());
    };

    updateTime();

    const timerId = window.setInterval(updateTime, 30_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const deadline = useMemo(
    () => Date.parse(fixture.entryDeadline),
    [fixture.entryDeadline],
  );

  const statusAllowsEntries =
    fixture.status === "scheduled" || fixture.status === "open";

  const isOpen = now !== null && now < deadline && statusAllowsEntries;

  const hasResult = fixture.homeScore !== null && fixture.awayScore !== null;

  return (
    <article className="prediction-card">
      <div className="fixture-topline">
        <span>{fixture.competition}</span>

        <span className={`status ${isOpen ? "status-open" : "status-closed"}`}>
          {isOpen ? "predictions open" : "predictions locked"}
        </span>
      </div>

      <div className="prediction-teams">
        <strong>{fixture.homeTeam}</strong>
        <span>vs</span>
        <strong>{fixture.awayTeam}</strong>
      </div>

      <div className="prediction-times">
        <p>
          <b>Kickoff:</b> {formatter.format(new Date(fixture.kickoff))}
        </p>

        <p>
          <b>Locks:</b> {formatter.format(new Date(fixture.entryDeadline))}
        </p>

        <p className={isOpen ? "countdown-open" : "countdown-closed"}>
          {now === null
            ? "Checking entry window…"
            : formatRemaining(deadline - now)}
        </p>
      </div>

      {isOpen ? (
        <form action={savePredictionAction} className="prediction-form">
          <input type="hidden" name="fixtureId" value={fixture.id} />

          <label>
            <span>{fixture.homeTeam}</span>

            <input
              name="homeScore"
              type="number"
              min="0"
              max="30"
              inputMode="numeric"
              required
              defaultValue={prediction?.predictedHomeScore ?? ""}
              aria-label={`${fixture.homeTeam} predicted score`}
            />
          </label>

          <span className="prediction-dash">–</span>

          <label>
            <span>{fixture.awayTeam}</span>

            <input
              name="awayScore"
              type="number"
              min="0"
              max="30"
              inputMode="numeric"
              required
              defaultValue={prediction?.predictedAwayScore ?? ""}
              aria-label={`${fixture.awayTeam} predicted score`}
            />
          </label>

          <button className="button button-primary" type="submit">
            {prediction ? "Update prediction" : "Save prediction"}
          </button>
        </form>
      ) : (
        <div className="locked-prediction">
          {prediction ? (
            <>
              <span>Your locked prediction</span>

              <strong>
                {fixture.homeTeam} {prediction.predictedHomeScore}–
                {prediction.predictedAwayScore} {fixture.awayTeam}
              </strong>
            </>
          ) : (
            <span>No prediction was submitted before the cutoff.</span>
          )}

          {hasResult && (
            <div className="prediction-result-summary">
              <span>Final score</span>

              <strong>
                {fixture.homeTeam} {fixture.homeScore}–{fixture.awayScore}{" "}
                {fixture.awayTeam}
              </strong>

              {prediction ? (
                scoreEvent ? (
                  <>
                    <b
                      className={
                        scoreEvent.points > 0
                          ? "points-earned positive-points"
                          : "points-earned zero-points"
                      }
                    >
                      {scoreEvent.points}{" "}
                      {scoreEvent.points === 1 ? "point" : "points"} earned
                    </b>

                    <small>
                      {scoreEvent.reason ?? "Prediction scored automatically."}
                    </small>
                  </>
                ) : (
                  <small className="points-pending">
                    Points are awaiting calculation.
                  </small>
                )
              ) : (
                <small>No points because no prediction was submitted.</small>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

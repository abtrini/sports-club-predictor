"use client";

import { useEffect, useState } from "react";

type DeadlineCountdownProps = {
  deadline: string;
  homeTeam: string;
  awayTeam: string;
};

function getRemainingTime(deadline: string) {
  return Math.max(0, new Date(deadline).getTime() - Date.now());
}

export function DeadlineCountdown({
  deadline,
  homeTeam,
  awayTeam,
}: DeadlineCountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      setRemaining(getRemainingTime(deadline));
    };

    updateCountdown();

    const timerId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [deadline]);

  if (remaining === null) {
    return (
      <div className="next-deadline-card">
        <span>Next prediction deadline</span>
        <h2>
          {homeTeam} vs {awayTeam}
        </h2>
        <p>Loading countdown…</p>
      </div>
    );
  }

  if (remaining <= 0) {
    return (
      <div className="next-deadline-card deadline-closed">
        <span>Prediction deadline</span>
        <h2>
          {homeTeam} vs {awayTeam}
        </h2>
        <strong>Predictions are closed</strong>
      </div>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="next-deadline-card">
      <span>Next prediction deadline</span>

      <h2>
        {homeTeam} vs {awayTeam}
      </h2>

      <p>Time left to submit or update your prediction</p>

      <div className="countdown-grid">
        <div>
          <strong>{String(days).padStart(2, "0")}</strong>
          <small>Days</small>
        </div>

        <div>
          <strong>{String(hours).padStart(2, "0")}</strong>
          <small>Hours</small>
        </div>

        <div>
          <strong>{String(minutes).padStart(2, "0")}</strong>
          <small>Minutes</small>
        </div>

        <div>
          <strong>{String(seconds).padStart(2, "0")}</strong>
          <small>Seconds</small>
        </div>
      </div>
    </div>
  );
}

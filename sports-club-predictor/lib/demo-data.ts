import type { ClubRules, Fixture, Standing } from "@/lib/types";

const samplePoints = [28, 25, 24, 23, 20, 19, 18, 17, 16, 14, 13, 12, 11, 9, 8, 7, 6, 4, 3, 1];

export const demoStandings: Standing[] = samplePoints.map((points, index) => ({
  id: `demo-${index + 1}`,
  name: `Participant ${String(index + 1).padStart(2, "0")}`,
  shortName: `P${index + 1}`,
  played: Math.max(1, Math.floor(points / 2)),
  exactHits: Math.floor(points / 6),
  correctOutcomes: Math.floor(points / 3),
  points,
}));

export const demoFixtures: Fixture[] = [
  {
    id: "fixture-1",
    competition: "Premier League",
    homeTeam: "Sample United",
    awayTeam: "Example City",
    kickoff: "2026-08-08T14:00:00-04:00",
    entryDeadline: "2026-08-08T13:45:00-04:00",
    status: "open",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "fixture-2",
    competition: "Premier League",
    homeTeam: "Demo Rovers",
    awayTeam: "Test Athletic",
    kickoff: "2026-08-09T11:30:00-04:00",
    entryDeadline: "2026-08-09T11:15:00-04:00",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  },
];

export const demoRules: ClubRules = {
  exactScorePoints: 3,
  correctOutcomePoints: 1,
  winnerOnlyPoints: 1,
  penaltyMode: "pending",
  entryNotes: "Predictions may be entered or changed until 15 minutes before kickoff. The database locks entries automatically at the cutoff.",
};

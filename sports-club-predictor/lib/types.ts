export type Standing = {
  id: string;
  name: string;
  shortName: string | null;
  played: number;
  exactHits: number;
  correctOutcomes: number;
  points: number;
};

export type Fixture = {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest: string | null;
  awayTeamCrest: string | null;
  kickoff: string;
  entryDeadline: string;
  status: "scheduled" | "open" | "closed" | "completed";
  homeScore: number | null;
  awayScore: number | null;
  dataSource?: string;
  externalFixtureId?: string | null;
  externalStatus?: string | null;
  resultBasis?: string | null;
  resultSyncedAt?: string | null;
  pointsCalculatedAt?: string | null;
};

export type Prediction = {
  id: string;
  fixtureId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  submittedAt: string;
  updatedAt: string;
};

export type ClubRules = {
  exactScorePoints: number;
  correctOutcomePoints: number;
  winnerOnlyPoints: number;
  penaltyMode:
    | "pending"
    | "ninety_minutes"
    | "after_extra_time"
    | "after_penalties";
  entryNotes: string;
};

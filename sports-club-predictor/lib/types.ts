export type ScoreEventType =
  | "exact_score"
  | "correct_winner"
  | "correct_draw"
  | "one_team_score"
  | "correct_outcome"
  | "winner_only"
  | "no_points"
  | "manual_adjustment";

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
  homeTeamCrest?: string | null;
  awayTeamCrest?: string | null;
  kickoff: string;
  entryDeadline: string;
  status: "scheduled" | "open" | "closed" | "completed";
  homeScore: number | null;
  awayScore: number | null;
  dataSource?: "manual" | "football-data" | string | null;
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

export type ScoreEvent = {
  fixtureId: string | null;
  points: number;
  eventType: ScoreEventType;
  reason: string | null;
};

export type ClubRules = {
  exactScorePoints: number;
  correctWinnerPoints: number;
  correctDrawPoints: number;
  oneTeamScorePoints: number;
  winnerOnlyPoints: number;
  penaltyMode:
    | "pending"
    | "ninety_minutes"
    | "after_extra_time"
    | "after_penalties";
  entryNotes: string;
};

export type PlayerDashboardStatus = {
  participantId: string;
  position: number | null;
  points: number;
  exactHits: number;
  openFixtureCount: number;
  submittedCount: number;
  missingCount: number;
  completionPercent: number;
  nextCutoff: string | null;
  nextFixtureId: string | null;
  nextFixtureLabel: string | null;
};

export type PlayerRecentResult = {
  fixtureId: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string;
  points: number;
  eventType: ScoreEventType;
  reason: string | null;
};

export type PlayerProfileStats = {
  participant: {
    id: string;
    name: string;
    shortName: string | null;
    active: boolean;
    joinedAt: string;
  };
  position: number | null;
  totalPlayers: number;
  points: number;
  played: number;
  exactHits: number;
  correctWinners: number;
  correctDraws: number;
  oneTeamScores: number;
  noPointResults: number;
  manualAdjustmentPoints: number;
  averagePoints: number;
  longestScoringStreak: number;
  bestWeekPoints: number;
  bestWeekLabel: string | null;
  recentResults: PlayerRecentResult[];
};

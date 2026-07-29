import type { ClubRules } from "@/lib/types";
import {
  getFootballDataMatchesByIds,
  type FootballDataMatch,
} from "@/lib/football-data";
import { createAdminClient } from "@/lib/supabase/admin";

type ImportedFixtureRow = {
  id: string;
  external_fixture_id: string;
  kickoff: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  points_calculated_at: string | null;
};

type RuleRow = {
  exact_score_points: number;
  correct_outcome_points: number;
  winner_only_points: number;
  penalty_mode: ClubRules["penaltyMode"];
  entry_notes: string;
};

type ScorePair = {
  home: number;
  away: number;
};

function readScorePair(
  value:
    | {
        home?: number | null;
        away?: number | null;
        homeTeam?: number | null;
        awayTeam?: number | null;
      }
    | null
    | undefined,
): ScorePair | null {
  if (!value) return null;

  const home = value.home ?? value.homeTeam;
  const away = value.away ?? value.awayTeam;

  if (!Number.isInteger(home) || !Number.isInteger(away)) return null;

  return { home: Number(home), away: Number(away) };
}

function addScores(first: ScorePair, second: ScorePair): ScorePair {
  return {
    home: first.home + second.home,
    away: first.away + second.away,
  };
}

function chooseScoringResult(
  match: FootballDataMatch,
  penaltyMode: ClubRules["penaltyMode"],
): { score: ScorePair; basis: string } | null {
  const fullTime = readScorePair(match.score?.fullTime);
  const regularTime = readScorePair(match.score?.regularTime);
  const extraTime = readScorePair(match.score?.extraTime);
  const duration = match.score?.duration ?? "REGULAR";

  if (penaltyMode === "after_penalties") {
    return fullTime ? { score: fullTime, basis: "after_penalties" } : null;
  }

  if (penaltyMode === "after_extra_time") {
    if (duration === "PENALTY_SHOOTOUT" && regularTime && extraTime) {
      return {
        score: addScores(regularTime, extraTime),
        basis: "after_extra_time",
      };
    }

    return fullTime ? { score: fullTime, basis: "after_extra_time" } : null;
  }

  // Pending decisions default safely to the 90-minute score.
  const ninetyMinuteScore = regularTime ?? fullTime;
  return ninetyMinuteScore
    ? { score: ninetyMinuteScore, basis: "ninety_minutes" }
    : null;
}

function mapFixtureStatus(apiStatus: string) {
  switch (apiStatus) {
    case "FINISHED":
      return "completed";
    case "IN_PLAY":
    case "PAUSED":
    case "SUSPENDED":
    case "CANCELLED":
    case "AWARDED":
      return "closed";
    default:
      return "scheduled";
  }
}

export type ResultSyncSummary = {
  checked: number;
  completed: number;
  recalculated: number;
  pending: number;
  errors: string[];
};

export async function syncFootballDataResults(): Promise<ResultSyncSummary> {
  const supabase = createAdminClient();
  const now = Date.now();
  const windowStart = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString();

  const [fixtureResponse, ruleResponse] = await Promise.all([
    supabase
      .from("fixtures")
      .select(
        "id, external_fixture_id, kickoff, status, home_score, away_score, points_calculated_at",
      )
      .eq("data_source", "football-data")
      .not("external_fixture_id", "is", null)
      .gte("kickoff", windowStart)
      .lte("kickoff", windowEnd)
      .order("kickoff", { ascending: true })
      .limit(40),
    supabase.from("rules").select("*").eq("id", 1).single(),
  ]);

  if (fixtureResponse.error) throw fixtureResponse.error;
  if (ruleResponse.error) throw ruleResponse.error;

  const fixtures = (fixtureResponse.data ?? []) as ImportedFixtureRow[];
  const rules = ruleResponse.data as RuleRow;

  if (fixtures.length === 0) {
    return {
      checked: 0,
      completed: 0,
      recalculated: 0,
      pending: 0,
      errors: [],
    };
  }

  const matches = await getFootballDataMatchesByIds(
    fixtures.map((fixture) => fixture.external_fixture_id),
  );
  const matchById = new Map(
    matches.map((match) => [String(match.id), match]),
  );

  const summary: ResultSyncSummary = {
    checked: fixtures.length,
    completed: 0,
    recalculated: 0,
    pending: 0,
    errors: [],
  };

  for (const fixture of fixtures) {
    const match = matchById.get(fixture.external_fixture_id);

    if (!match) {
      summary.errors.push(`No API result returned for match ${fixture.external_fixture_id}.`);
      continue;
    }

    try {
      const commonUpdate = {
        competition: match.competition.name,
        competition_code: match.competition.code,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        home_team_crest: match.homeTeam.crest,
        away_team_crest: match.awayTeam.crest,
        kickoff: new Date(match.utcDate).toISOString(),
        external_status: match.status,
        source_updated_at: match.lastUpdated || new Date().toISOString(),
        status: mapFixtureStatus(match.status),
      };

      if (match.status !== "FINISHED") {
        const { error } = await supabase
          .from("fixtures")
          .update(commonUpdate)
          .eq("id", fixture.id);
        if (error) throw error;

        summary.pending += 1;
        continue;
      }

      const selectedResult = chooseScoringResult(match, rules.penalty_mode);
      if (!selectedResult) {
        throw new Error("Finished match did not include a usable score.");
      }

      const scoreChanged =
        fixture.home_score !== selectedResult.score.home ||
        fixture.away_score !== selectedResult.score.away;

      const { error: updateError } = await supabase
        .from("fixtures")
        .update({
          ...commonUpdate,
          status: "completed",
          home_score: selectedResult.score.home,
          away_score: selectedResult.score.away,
          result_basis: selectedResult.basis,
          result_synced_at: new Date().toISOString(),
        })
        .eq("id", fixture.id);

      if (updateError) throw updateError;

      if (scoreChanged || !fixture.points_calculated_at) {
        const { error: scoringError } = await supabase.rpc(
          "calculate_fixture_points",
          { target_fixture_id: fixture.id },
        );
        if (scoringError) throw scoringError;
        summary.recalculated += 1;
      }

      summary.completed += 1;
    } catch (error) {
      summary.errors.push(
        `${match.homeTeam.name} vs ${match.awayTeam.name}: ${
          error instanceof Error ? error.message : "Unknown sync error"
        }`,
      );
    }
  }

  return summary;
}

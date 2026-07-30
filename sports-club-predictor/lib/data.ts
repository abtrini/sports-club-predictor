import { demoFixtures, demoRules, demoStandings } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ClubRules, Fixture, Standing } from "@/lib/types";

type ParticipantRow = {
  id: string;
  name: string;
  short_name: string | null;
};

type ScoreEventRow = {
  participant_id: string;
  fixture_id: string | null;
  points: number;
  event_type:
    | "exact_score"
    | "correct_winner"
    | "correct_draw"
    | "one_team_score"
    | "correct_outcome"
    | "winner_only"
    | "no_points"
    | "manual_adjustment";
};

type FixtureRow = {
  id: string;
  competition: string;
  home_team: string;
  away_team: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  kickoff: string;
  entry_deadline: string;
  status: Fixture["status"];
  home_score: number | null;
  away_score: number | null;
};

type RuleRow = {
  exact_score_points: number;
  correct_winner_points: number;
  correct_draw_points: number;
  one_team_score_points: number;
  winner_only_points: number;
  penalty_mode: ClubRules["penaltyMode"];
  entry_notes: string;
};

export async function getStandings(): Promise<Standing[]> {
  if (!isSupabaseConfigured()) return demoStandings;

  const supabase = await createClient();
  const [
    { data: participants, error: participantError },
    { data: events, error: eventError },
  ] = await Promise.all([
    supabase
      .from("participants")
      .select("id, name, short_name")
      .eq("active", true),
    supabase
      .from("score_events")
      .select("participant_id, fixture_id, points, event_type"),
  ]);

  if (participantError || eventError || !participants) {
    return demoStandings;
  }

  const participantRows = participants as ParticipantRow[];
  const eventRows = (events ?? []) as ScoreEventRow[];

  const standings = participantRows.map((participant) => {
    const participantEvents = eventRows.filter(
      (event) => event.participant_id === participant.id,
    );

    const played = new Set(
      participantEvents
        .map((event) => event.fixture_id)
        .filter((fixtureId): fixtureId is string => Boolean(fixtureId)),
    ).size;

    return {
      id: participant.id,
      name: participant.name,
      shortName: participant.short_name,
      played,
      exactHits: participantEvents.filter(
        (event) => event.event_type === "exact_score",
      ).length,
      correctOutcomes: participantEvents.filter(
        (event) =>
          event.event_type === "correct_winner" ||
          event.event_type === "correct_draw" ||
          event.event_type === "correct_outcome" ||
          event.event_type === "winner_only",
      ).length,
      points: participantEvents.reduce(
        (total, event) => total + event.points,
        0,
      ),
    } satisfies Standing;
  });

  return standings.sort(
    (a, b) =>
      b.points - a.points ||
      b.exactHits - a.exactHits ||
      b.correctOutcomes - a.correctOutcomes ||
      a.name.localeCompare(b.name),
  );
}

export async function getFixtures(
  options: { fallbackToDemo?: boolean } = {},
): Promise<Fixture[]> {
  const { fallbackToDemo = true } = options;

  if (!isSupabaseConfigured()) {
    return demoFixtures;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixtures")
    .select(
      `
        id,
        competition,
        home_team,
        away_team,
        home_team_crest,
        away_team_crest,
        kickoff,
        entry_deadline,
        status,
        home_score,
        away_score
      `,
    )
    .order("kickoff", { ascending: true });

  if (error || !data) {
    return fallbackToDemo ? demoFixtures : [];
  }

  return (data as FixtureRow[]).map((fixture) => ({
    id: fixture.id,
    competition: fixture.competition,
    homeTeam: fixture.home_team,
    awayTeam: fixture.away_team,
    homeTeamCrest: fixture.home_team_crest,
    awayTeamCrest: fixture.away_team_crest,
    kickoff: fixture.kickoff,
    entryDeadline: fixture.entry_deadline,
    status: fixture.status,
    homeScore: fixture.home_score,
    awayScore: fixture.away_score,
  }));
}

export async function getRules(): Promise<ClubRules> {
  if (!isSupabaseConfigured()) return demoRules;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rules")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return demoRules;
  const rule = data as RuleRow;

  return {
    exactScorePoints: rule.exact_score_points,
    correctWinnerPoints: rule.correct_winner_points,
    correctDrawPoints: rule.correct_draw_points,
    oneTeamScorePoints: rule.one_team_score_points,
    winnerOnlyPoints: rule.winner_only_points,
    penaltyMode: rule.penalty_mode,
    entryNotes: rule.entry_notes,
  };
}

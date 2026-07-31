import { getStandings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type {
  Fixture,
  PlayerDashboardStatus,
  PlayerProfileStats,
  PlayerRecentResult,
  ScoreEventType,
  Standing,
} from "@/lib/types";

type ParticipantRow = {
  id: string;
  name: string;
  short_name: string | null;
  active: boolean;
  created_at: string;
};

type PredictionFixtureRow = {
  fixture_id: string;
};

type ProfileScoreEventRow = {
  fixture_id: string | null;
  event_type: ScoreEventType;
  points: number;
  reason: string | null;
  created_at: string;
};

type ProfileFixtureRow = {
  id: string;
  competition: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: Fixture["status"];
  home_score: number | null;
  away_score: number | null;
};

function getStanding(
  participantId: string,
  standings: Standing[],
) {
  const index = standings.findIndex(
    (standing) => standing.id === participantId,
  );

  return {
    standing: index >= 0 ? standings[index] : null,
    position: index >= 0 ? index + 1 : null,
  };
}

export function buildPlayerDashboardStatus({
  participantId,
  predictedFixtureIds,
  fixtures,
  standings,
  now,
}: {
  participantId: string;
  predictedFixtureIds: Iterable<string>;
  fixtures: Fixture[];
  standings: Standing[];
  now: number;
}): PlayerDashboardStatus {
  const predictedIds = new Set(predictedFixtureIds);

  const openFixtures = fixtures
    .filter(
      (fixture) =>
        fixture.status !== "completed" &&
        (fixture.status === "scheduled" ||
          fixture.status === "open") &&
        new Date(fixture.entryDeadline).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.entryDeadline).getTime() -
        new Date(b.entryDeadline).getTime(),
    );

  const submittedCount = openFixtures.filter((fixture) =>
    predictedIds.has(fixture.id),
  ).length;

  const missingCount = Math.max(
    0,
    openFixtures.length - submittedCount,
  );

  const nextFixture = openFixtures[0] ?? null;
  const { standing, position } = getStanding(
    participantId,
    standings,
  );

  return {
    participantId,
    position,
    points: standing?.points ?? 0,
    exactHits: standing?.exactHits ?? 0,
    openFixtureCount: openFixtures.length,
    submittedCount,
    missingCount,
    completionPercent:
      openFixtures.length === 0
        ? 100
        : Math.round(
            (submittedCount / openFixtures.length) * 100,
          ),
    nextCutoff: nextFixture?.entryDeadline ?? null,
    nextFixtureId: nextFixture?.id ?? null,
    nextFixtureLabel: nextFixture
      ? `${nextFixture.homeTeam} vs ${nextFixture.awayTeam}`
      : null,
  };
}

export async function getPlayerDashboardStatus({
  participantId,
  fixtures,
  standings,
  now,
}: {
  participantId: string;
  fixtures: Fixture[];
  standings: Standing[];
  now: number;
}): Promise<PlayerDashboardStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("fixture_id")
    .eq("participant_id", participantId);

  if (error) {
    throw new Error(
      `Unable to load your prediction status: ${error.message}`,
    );
  }

  const rows = (data ?? []) as PredictionFixtureRow[];

  return buildPlayerDashboardStatus({
    participantId,
    predictedFixtureIds: rows.map((row) => row.fixture_id),
    fixtures,
    standings,
    now,
  });
}

function getEventLabel(eventType: ScoreEventType) {
  switch (eventType) {
    case "exact_score":
      return "Exact score";
    case "correct_winner":
    case "correct_outcome":
    case "winner_only":
      return "Correct winner";
    case "correct_draw":
      return "Correct draw";
    case "one_team_score":
      return "One team score";
    case "no_points":
      return "No points";
    case "manual_adjustment":
      return "Manual adjustment";
    default:
      return "Scored prediction";
  }
}

function getTrinidadWeekStart(dateString: string) {
  const source = new Date(dateString);

  // Trinidad and Tobago uses UTC-4 throughout the year.
  const localDate = new Date(
    source.getTime() - 4 * 60 * 60 * 1000,
  );

  const daysFromMonday = (localDate.getUTCDay() + 6) % 7;
  localDate.setUTCDate(
    localDate.getUTCDate() - daysFromMonday,
  );
  localDate.setUTCHours(0, 0, 0, 0);

  return localDate.toISOString();
}

function formatWeekLabel(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const formatter = new Intl.DateTimeFormat("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export async function getPlayerProfileStats(
  participantId: string,
): Promise<PlayerProfileStats | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const [participantResponse, scoreResponse, standings] =
    await Promise.all([
      supabase
        .from("participants")
        .select("id, name, short_name, active, created_at")
        .eq("id", participantId)
        .maybeSingle(),
      supabase
        .from("score_events")
        .select(
          "fixture_id, event_type, points, reason, created_at",
        )
        .eq("participant_id", participantId),
      getStandings(),
    ]);

  if (participantResponse.error) {
    throw new Error(participantResponse.error.message);
  }

  if (scoreResponse.error) {
    throw new Error(scoreResponse.error.message);
  }

  if (!participantResponse.data) return null;

  const participant =
    participantResponse.data as ParticipantRow;
  const events =
    (scoreResponse.data ?? []) as ProfileScoreEventRow[];

  const fixtureIds = Array.from(
    new Set(
      events
        .map((event) => event.fixture_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let fixtureRows: ProfileFixtureRow[] = [];

  if (fixtureIds.length > 0) {
    const fixtureResponse = await supabase
      .from("fixtures")
      .select(
        "id, competition, home_team, away_team, kickoff, status, home_score, away_score",
      )
      .in("id", fixtureIds);

    if (fixtureResponse.error) {
      throw new Error(fixtureResponse.error.message);
    }

    fixtureRows =
      (fixtureResponse.data ?? []) as ProfileFixtureRow[];
  }

  const fixtureById = new Map(
    fixtureRows.map((fixture) => [fixture.id, fixture]),
  );

  const automaticEvents = events.filter(
    (event) =>
      event.fixture_id !== null &&
      event.event_type !== "manual_adjustment",
  );

  const recentResults: PlayerRecentResult[] = automaticEvents
    .flatMap((event): PlayerRecentResult[] => {
      const fixture = event.fixture_id
        ? fixtureById.get(event.fixture_id)
        : undefined;

      if (!fixture) return [];

      return [
        {
          fixtureId: fixture.id,
          competition: fixture.competition,
          homeTeam: fixture.home_team,
          awayTeam: fixture.away_team,
          homeScore: fixture.home_score,
          awayScore: fixture.away_score,
          kickoff: fixture.kickoff,
          points: event.points,
          eventType: event.event_type,
          reason:
            event.reason || getEventLabel(event.event_type),
        },
      ];
    })
    .sort(
      (a, b) =>
        new Date(b.kickoff).getTime() -
        new Date(a.kickoff).getTime(),
    )
    .slice(0, 5);

  const chronologicalEvents = automaticEvents
    .map((event) => ({
      event,
      fixture: event.fixture_id
        ? fixtureById.get(event.fixture_id)
        : undefined,
    }))
    .filter(
      (
        item,
      ): item is {
        event: ProfileScoreEventRow;
        fixture: ProfileFixtureRow;
      } => Boolean(item.fixture),
    )
    .sort(
      (a, b) =>
        new Date(a.fixture.kickoff).getTime() -
        new Date(b.fixture.kickoff).getTime(),
    );

  let longestScoringStreak = 0;
  let currentScoringStreak = 0;

  for (const item of chronologicalEvents) {
    if (item.event.points > 0) {
      currentScoringStreak += 1;
      longestScoringStreak = Math.max(
        longestScoringStreak,
        currentScoringStreak,
      );
    } else {
      currentScoringStreak = 0;
    }
  }

  const weeklyPoints = new Map<string, number>();

  for (const item of chronologicalEvents) {
    const weekStart = getTrinidadWeekStart(
      item.fixture.kickoff,
    );

    weeklyPoints.set(
      weekStart,
      (weeklyPoints.get(weekStart) ?? 0) + item.event.points,
    );
  }

  let bestWeekStart: string | null = null;
  let bestWeekPoints = 0;

  for (const [weekStart, points] of weeklyPoints) {
    if (
      bestWeekStart === null ||
      points > bestWeekPoints
    ) {
      bestWeekStart = weekStart;
      bestWeekPoints = points;
    }
  }

  const { standing, position } = getStanding(
    participantId,
    standings,
  );

  const points =
    standing?.points ??
    events.reduce((total, event) => total + event.points, 0);

  const played = new Set(
    automaticEvents
      .map((event) => event.fixture_id)
      .filter((id): id is string => Boolean(id)),
  ).size;

  return {
    participant: {
      id: participant.id,
      name: participant.name,
      shortName: participant.short_name,
      active: participant.active,
      joinedAt: participant.created_at,
    },
    position,
    totalPlayers: standings.length,
    points,
    played,
    exactHits: automaticEvents.filter(
      (event) => event.event_type === "exact_score",
    ).length,
    correctWinners: automaticEvents.filter(
      (event) =>
        event.event_type === "correct_winner" ||
        event.event_type === "correct_outcome" ||
        event.event_type === "winner_only",
    ).length,
    correctDraws: automaticEvents.filter(
      (event) => event.event_type === "correct_draw",
    ).length,
    oneTeamScores: automaticEvents.filter(
      (event) => event.event_type === "one_team_score",
    ).length,
    noPointResults: automaticEvents.filter(
      (event) =>
        event.event_type === "no_points" ||
        event.points === 0,
    ).length,
    manualAdjustmentPoints: events
      .filter(
        (event) => event.event_type === "manual_adjustment",
      )
      .reduce((total, event) => total + event.points, 0),
    averagePoints:
      played > 0
        ? Number((points / played).toFixed(2))
        : 0,
    longestScoringStreak,
    bestWeekPoints,
    bestWeekLabel: bestWeekStart
      ? formatWeekLabel(bestWeekStart)
      : null,
    recentResults,
  };
}

const API_BASE_URL = "https://api.football-data.org/v4";

export const FOOTBALL_COMPETITIONS = [
  { code: "PL", name: "Premier League — England" },
  { code: "ELC", name: "Championship — England" },
  { code: "CL", name: "UEFA Champions League" },
  { code: "PD", name: "La Liga — Spain" },
  { code: "BL1", name: "Bundesliga — Germany" },
  { code: "SA", name: "Serie A — Italy" },
  { code: "FL1", name: "Ligue 1 — France" },
  { code: "PPL", name: "Primeira Liga — Portugal" },
  { code: "DED", name: "Eredivisie — Netherlands" },
  { code: "BSA", name: "Série A — Brazil" },
  { code: "WC", name: "FIFA World Cup" },
  { code: "EC", name: "European Championship" },
] as const;

export type FootballCompetitionCode = (typeof FOOTBALL_COMPETITIONS)[number]["code"];

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string | null;
  lastUpdated: string;
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string | null;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string | null;
    tla: string | null;
    crest: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string | null;
    tla: string | null;
    crest: string | null;
  };
};

type FootballDataMatchesResponse = {
  matches?: FootballDataMatch[];
  message?: string;
  error?: string;
};

function assertDateInput(value: string, fieldName: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }
}

function addUtcDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validateCompetitionCode(code: string): asserts code is FootballCompetitionCode {
  if (!FOOTBALL_COMPETITIONS.some((competition) => competition.code === code)) {
    throw new Error("Choose a supported competition.");
  }
}

export function isFootballDataConfigured() {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY?.trim());
}

export function getDefaultFootballDateRange() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) throw new Error("Unable to calculate today's date.");

  const dateFrom = `${year}-${month}-${day}`;
  return { dateFrom, dateTo: addUtcDays(dateFrom, 7) };
}

export async function getFootballDataMatches({
  competitionCode,
  dateFrom,
  dateTo,
}: {
  competitionCode: string;
  dateFrom: string;
  dateTo: string;
}): Promise<FootballDataMatch[]> {
  validateCompetitionCode(competitionCode);
  assertDateInput(dateFrom, "Start date");
  assertDateInput(dateTo, "End date");

  const start = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  const rangeDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  if (rangeDays < 0) throw new Error("End date must be on or after the start date.");
  if (rangeDays > 31) throw new Error("Choose a date range of 31 days or fewer.");

  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY has not been added to Vercel.");
  }

  const url = new URL(`${API_BASE_URL}/competitions/${competitionCode}/matches`);
  url.searchParams.set("dateFrom", dateFrom);
  // football-data.org treats dateTo as an exclusive boundary in v4,
  // so add one day to include the date selected by the administrator.
  url.searchParams.set("dateTo", addUtcDays(dateTo, 1));

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": apiKey,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as FootballDataMatchesResponse;

  if (!response.ok) {
    const reason = payload.message || payload.error || `Football-data request failed (${response.status}).`;
    throw new Error(reason);
  }

  return (payload.matches ?? [])
    .filter((match) => match.status === "SCHEDULED" || match.status === "TIMED")
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
}

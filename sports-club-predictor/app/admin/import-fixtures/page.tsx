import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import {
  FOOTBALL_COMPETITIONS,
  getDefaultFootballDateRange,
  getFootballDataMatches,
  isFootballDataConfigured,
  type FootballDataMatch,
} from "@/lib/football-data";
import { createClient } from "@/lib/supabase/server";
import { importFootballDataFixturesAction } from "./actions";

export const dynamic = "force-dynamic";

function formatKickoff(utcDate: string) {
  return new Intl.DateTimeFormat("en-TT", {
    timeZone: "America/Port_of_Spain",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utcDate));
}

function isImported(existingIds: Set<string>, match: FootballDataMatch) {
  return existingIds.has(String(match.id));
}

export default async function ImportFixturesPage({
  searchParams,
}: {
  searchParams: Promise<{
    competition?: string;
    dateFrom?: string;
    dateTo?: string;
    load?: string;
    message?: string;
  }>;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?message=Administrator%20access%20required.&next=%2Fadmin%2Fimport-fixtures");

  const params = await searchParams;
  const defaults = getDefaultFootballDateRange();
  const competitionCode = params.competition || "PL";
  const dateFrom = params.dateFrom || defaults.dateFrom;
  const dateTo = params.dateTo || defaults.dateTo;
  const shouldLoad = params.load === "1";

  let matches: FootballDataMatch[] = [];
  let loadError = "";
  const existingIds = new Set<string>();

  if (shouldLoad && isFootballDataConfigured()) {
    try {
      matches = await getFootballDataMatches({ competitionCode, dateFrom, dateTo });

      if (matches.length > 0) {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("fixtures")
          .select("external_fixture_id")
          .eq("data_source", "football-data")
          .in(
            "external_fixture_id",
            matches.map((match) => String(match.id)),
          );

        if (error) throw error;
        for (const row of data ?? []) {
          if (row.external_fixture_id) existingIds.add(String(row.external_fixture_id));
        }
      }
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to load fixtures.";
    }
  }

  return (
    <section className="page-width page-top section-block">
      <div className="admin-heading">
        <div>
          <p className="eyebrow dark">WEEKLY FIXTURE IMPORT</p>
          <h1>Select official games</h1>
          <p>Load a competition schedule, tick the club&apos;s games, then import them into Supabase.</p>
        </div>
        <Link className="button button-secondary" href="/admin">Back to admin</Link>
      </div>

      {params.message && <div className="form-message success-message">{params.message}</div>}
      {loadError && <div className="form-message error-message">{loadError}</div>}

      {!isFootballDataConfigured() && (
        <article className="content-card importer-warning">
          <h2>API key required</h2>
          <p>Add <code>FOOTBALL_DATA_API_KEY</code> to Vercel, then redeploy the site.</p>
        </article>
      )}

      <article className="content-card">
        <h2>1. Load the weekly schedule</h2>
        <form className="import-filter-form" method="get">
          <input name="load" type="hidden" value="1" />
          <label>
            Competition
            <select name="competition" defaultValue={competitionCode}>
              {FOOTBALL_COMPETITIONS.map((competition) => (
                <option key={competition.code} value={competition.code}>
                  {competition.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input name="dateFrom" type="date" defaultValue={dateFrom} required />
          </label>
          <label>
            To
            <input name="dateTo" type="date" defaultValue={dateTo} required />
          </label>
          <button className="button button-primary" type="submit" disabled={!isFootballDataConfigured()}>
            Load fixtures
          </button>
        </form>
      </article>

      {shouldLoad && !loadError && (
        <article className="content-card importer-results">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow dark">OFFICIAL SCHEDULE</p>
              <h2>2. Choose games to import</h2>
            </div>
            <p>{matches.length} upcoming fixture{matches.length === 1 ? "" : "s"} found</p>
          </div>

          {matches.length === 0 ? (
            <p>No scheduled fixtures were returned for this competition and date range.</p>
          ) : (
            <form action={importFootballDataFixturesAction}>
              <input name="competitionCode" type="hidden" value={competitionCode} />
              <input name="dateFrom" type="hidden" value={dateFrom} />
              <input name="dateTo" type="hidden" value={dateTo} />

              <div className="import-match-list">
                {matches.map((match) => {
                  const imported = isImported(existingIds, match);
                  return (
                    <label className="import-match-row" key={match.id}>
                      <input name="matchId" type="checkbox" value={match.id} />
                      <span className="import-match-main">
                        <strong>{match.homeTeam.name} <span>vs</span> {match.awayTeam.name}</strong>
                        <small>{formatKickoff(match.utcDate)} · Trinidad &amp; Tobago time</small>
                      </span>
                      <span className={`import-badge ${imported ? "imported" : "new"}`}>
                        {imported ? "Already imported" : "New"}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="import-actions">
                <p>Imported games close automatically 15 minutes before kickoff.</p>
                <button className="button button-primary" type="submit">Import selected games</button>
              </div>
            </form>
          )}
        </article>
      )}
    </section>
  );
}

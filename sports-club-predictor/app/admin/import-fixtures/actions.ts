"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { getFootballDataMatches } from "@/lib/football-data";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?message=Administrator%20access%20required.&next=%2Fadmin%2Fimport-fixtures");
  return admin;
}

function returnToImporter({
  competitionCode,
  dateFrom,
  dateTo,
  message,
}: {
  competitionCode: string;
  dateFrom: string;
  dateTo: string;
  message: string;
}): never {
  const params = new URLSearchParams({
    competition: competitionCode,
    dateFrom,
    dateTo,
    load: "1",
    message,
  });
  redirect(`/admin/import-fixtures?${params.toString()}`);
}

export async function importFootballDataFixturesAction(formData: FormData) {
  await requireAdmin();

  const competitionCode = String(formData.get("competitionCode") ?? "");
  const dateFrom = String(formData.get("dateFrom") ?? "");
  const dateTo = String(formData.get("dateTo") ?? "");
  const selectedIds = Array.from(
    new Set(
      formData
        .getAll("matchId")
        .map((value) => String(value))
        .filter((value) => /^\d+$/.test(value)),
    ),
  );

  if (selectedIds.length === 0) {
    returnToImporter({
      competitionCode,
      dateFrom,
      dateTo,
      message: "Select at least one match to import.",
    });
  }

  if (selectedIds.length > 40) {
    returnToImporter({
      competitionCode,
      dateFrom,
      dateTo,
      message: "Import no more than 40 matches at once.",
    });
  }

  try {
    const matches = await getFootballDataMatches({ competitionCode, dateFrom, dateTo });
    const selectedSet = new Set(selectedIds);
    const selectedMatches = matches.filter((match) => selectedSet.has(String(match.id)));

    if (selectedMatches.length === 0) {
      throw new Error("The selected matches are no longer available in that schedule. Load the fixtures again.");
    }

    const rows = selectedMatches.map((match) => {
      const kickoff = new Date(match.utcDate);
      return {
        competition: match.competition.name,
        competition_code: match.competition.code,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        home_team_crest: match.homeTeam.crest,
        away_team_crest: match.awayTeam.crest,
        kickoff: kickoff.toISOString(),
        entry_deadline: new Date(kickoff.getTime() - 15 * 60 * 1000).toISOString(),
        status: "scheduled",
        data_source: "football-data",
        external_fixture_id: String(match.id),
        external_status: match.status,
        source_updated_at: match.lastUpdated || new Date().toISOString(),
      };
    });

    const supabase = await createClient();
    const { error } = await supabase.from("fixtures").upsert(rows, {
      onConflict: "data_source,external_fixture_id",
    });

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/fixtures");
    revalidatePath("/predictions");
    revalidatePath("/admin");
    revalidatePath("/admin/import-fixtures");

    returnToImporter({
      competitionCode,
      dateFrom,
      dateTo,
      message: `${selectedMatches.length} fixture${selectedMatches.length === 1 ? "" : "s"} imported or refreshed successfully.`,
    });
  } catch (error) {
    returnToImporter({
      competitionCode,
      dateFrom,
      dateTo,
      message: error instanceof Error ? error.message : "Unable to import fixtures.",
    });
  }
}

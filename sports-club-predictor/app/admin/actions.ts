"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { syncFootballDataResults } from "@/lib/result-sync";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/login?message=Administrator%20access%20required.&next=%2Fadmin");
  }
  return admin;
}

function adminRedirect(message: string): never {
  redirect(`/admin?message=${encodeURIComponent(message)}`);
}

function revalidateCompetitionPages() {
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/fixtures");
  revalidatePath("/predictions");
  revalidatePath("/admin");
}

function trinidadDateTimeToIso(value: string) {
  if (!value) throw new Error("A date and time are required.");
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${withSeconds}-04:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date and time.");
  }
  return date.toISOString();
}

export async function addParticipantAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const shortName = String(formData.get("shortName") ?? "")
    .trim()
    .toUpperCase();
  if (name.length < 2) adminRedirect("Participant name is required.");

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  if (countError) adminRedirect(countError.message);
  if ((count ?? 0) >= 20) {
    adminRedirect("The league already has 20 active participants.");
  }

  const { error } = await supabase.from("participants").insert({
    name,
    short_name: shortName || null,
  });
  if (error) adminRedirect(error.message);

  revalidateCompetitionPages();
  adminRedirect(
    `${name} added to the table. They can register later using the same full name.`,
  );
}

export async function addFixtureAction(formData: FormData) {
  await requireAdmin();
  const competition = String(formData.get("competition") ?? "").trim();
  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();

  try {
    const kickoff = trinidadDateTimeToIso(
      String(formData.get("kickoff") ?? ""),
    );
    if (!competition || !homeTeam || !awayTeam) {
      throw new Error("Complete all fixture fields.");
    }

    const kickoffDate = new Date(kickoff);
    if (kickoffDate.getTime() <= Date.now()) {
      throw new Error("Kickoff must be in the future.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("fixtures").insert({
      competition,
      home_team: homeTeam,
      away_team: awayTeam,
      kickoff,
      entry_deadline: new Date(
        kickoffDate.getTime() - 15 * 60 * 1000,
      ).toISOString(),
      status: "scheduled",
      data_source: "manual",
    });
    if (error) throw error;

    revalidateCompetitionPages();
    adminRedirect(
      "Manual fixture added. Enter its result after the game; points will calculate automatically.",
    );
  } catch (error) {
    adminRedirect(
      error instanceof Error ? error.message : "Unable to add fixture.",
    );
  }
}

export async function addPointsAction(formData: FormData) {
  await requireAdmin();
  const participantId = String(formData.get("participantId") ?? "");
  const points = Number(formData.get("points"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (
    !participantId ||
    !Number.isInteger(points) ||
    points < -10 ||
    points > 10
  ) {
    adminRedirect(
      "Choose a participant and enter an adjustment between -10 and 10 points.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("score_events").insert({
    participant_id: participantId,
    fixture_id: null,
    event_type: "manual_adjustment",
    points,
    reason: reason || "Manual adjustment entered by administrator",
  });
  if (error) adminRedirect(error.message);

  revalidateCompetitionPages();
  adminRedirect("Manual adjustment saved and standings recalculated.");
}

export async function updateFixtureAction(formData: FormData) {
  await requireAdmin();
  const fixtureId = String(formData.get("fixtureId") ?? "");
  const status = String(formData.get("status") ?? "scheduled");
  const homeScoreRaw = String(formData.get("homeScore") ?? "").trim();
  const awayScoreRaw = String(formData.get("awayScore") ?? "").trim();
  const homeScore = homeScoreRaw === "" ? null : Number(homeScoreRaw);
  const awayScore = awayScoreRaw === "" ? null : Number(awayScoreRaw);

  if (!fixtureId) adminRedirect("Choose a manual fixture.");
  if (
    (homeScore !== null && !Number.isInteger(homeScore)) ||
    (awayScore !== null && !Number.isInteger(awayScore))
  ) {
    adminRedirect("Scores must be whole numbers.");
  }
  if (status === "completed" && (homeScore === null || awayScore === null)) {
    adminRedirect("Enter both scores before marking a fixture completed.");
  }

  const supabase = await createClient();
  const { data: fixture, error: fixtureLookupError } = await supabase
    .from("fixtures")
    .select("data_source")
    .eq("id", fixtureId)
    .maybeSingle();

  if (fixtureLookupError || !fixture) {
    adminRedirect("Fixture not found.");
  }
  if (fixture.data_source !== "manual") {
    adminRedirect(
      "Official fixtures are updated from football-data.org. Use Sync official results instead.",
    );
  }

  const { error } = await supabase
    .from("fixtures")
    .update({
      status,
      home_score: homeScore,
      away_score: awayScore,
      result_basis: "manual",
      result_synced_at: null,
    })
    .eq("id", fixtureId);
  if (error) adminRedirect(error.message);

  if (status === "completed") {
    const { error: scoringError } = await supabase.rpc(
      "calculate_fixture_points",
      { target_fixture_id: fixtureId },
    );
    if (scoringError) adminRedirect(scoringError.message);
  } else {
    const { error: clearingError } = await supabase.rpc(
      "clear_fixture_points",
      { target_fixture_id: fixtureId },
    );
    if (clearingError) adminRedirect(clearingError.message);
  }

  revalidateCompetitionPages();
  adminRedirect(
    status === "completed"
      ? "Manual result saved and player points calculated automatically."
      : "Manual fixture updated. Automatic points were cleared until a completed result is entered.",
  );
}

export async function deleteFixtureAction(formData: FormData) {
  await requireAdmin();

  const fixtureId = String(formData.get("fixtureId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!fixtureId) {
    adminRedirect("Choose a fixture to delete.");
  }

  if (confirmation !== "DELETE") {
    adminRedirect(
      'Type the word "DELETE" exactly to confirm fixture deletion.',
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_fixture", {
    target_fixture_id: fixtureId,
    confirmation_text: confirmation,
  });

  if (error) {
    adminRedirect(error.message);
  }

  revalidateCompetitionPages();

  const result = data as {
    home_team?: string;
    away_team?: string;
    predictions_deleted?: number;
    score_events_deleted?: number;
  } | null;

  const fixtureName = `${result?.home_team ?? "Fixture"} vs ${
    result?.away_team ?? "opponent"
  }`;

  adminRedirect(
    `${fixtureName} was permanently deleted with ${
      result?.predictions_deleted ?? 0
    } prediction(s) and ${
      result?.score_events_deleted ?? 0
    } attached score record(s).`,
  );
}

export async function syncOfficialResultsAction() {
  await requireAdmin();

  let summary: Awaited<ReturnType<typeof syncFootballDataResults>>;

  try {
    summary = await syncFootballDataResults();
  } catch (error) {
    adminRedirect(`Official result sync failed: ${getErrorMessage(error)}`);
  }

  revalidateCompetitionPages();

  const baseMessage =
    `Checked ${summary.checked} official fixture(s); ` +
    `${summary.completed} completed, ` +
    `${summary.pending} still pending, ` +
    `${summary.recalculated} points calculation(s) updated.`;

  const finalMessage =
    summary.errors.length > 0
      ? `${baseMessage} ${summary.errors.length} item(s) need review.`
      : baseMessage;

  adminRedirect(finalMessage);
}

export async function updateRulesAction(formData: FormData) {
  await requireAdmin();

  const exactScorePoints = Number(formData.get("exactScorePoints"));

  const correctWinnerPoints = Number(formData.get("correctWinnerPoints"));

  const correctDrawPoints = Number(formData.get("correctDrawPoints"));

  const oneTeamScorePoints = Number(formData.get("oneTeamScorePoints"));

  const penaltyMode = String(formData.get("penaltyMode") ?? "pending");

  const entryNotes = String(formData.get("entryNotes") ?? "").trim();

  const pointValues = [
    exactScorePoints,
    correctWinnerPoints,
    correctDrawPoints,
    oneTeamScorePoints,
  ];

  if (
    !pointValues.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 10,
    )
  ) {
    adminRedirect("All scoring values must be whole numbers between 0 and 10.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("rules").upsert({
    id: 1,
    exact_score_points: exactScorePoints,
    correct_winner_points: correctWinnerPoints,
    correct_draw_points: correctDrawPoints,
    one_team_score_points: oneTeamScorePoints,

    // Keeps older code compatible.
    correct_outcome_points: correctWinnerPoints,

    penalty_mode: penaltyMode,
    entry_notes: entryNotes,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    adminRedirect(error.message);
  }

  const { data: recalculated, error: recalculationError } = await supabase.rpc(
    "recalculate_all_completed_fixtures",
  );

  if (recalculationError) {
    adminRedirect(recalculationError.message);
  }

  revalidateCompetitionPages();

  adminRedirect(
    `Rules saved. ${recalculated ?? 0} completed fixture(s) recalculated.`,
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unable to sync official results.";
}

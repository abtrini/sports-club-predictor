"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?message=Administrator%20access%20required.&next=%2Fadmin");
  return admin;
}

function adminRedirect(message: string): never {
  redirect(`/admin?message=${encodeURIComponent(message)}`);
}

function trinidadDateTimeToIso(value: string) {
  if (!value) throw new Error("A date and time are required.");
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${withSeconds}-04:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date and time.");
  return date.toISOString();
}

export async function addParticipantAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const shortName = String(formData.get("shortName") ?? "").trim().toUpperCase();
  if (name.length < 2) adminRedirect("Participant name is required.");

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  if (countError) adminRedirect(countError.message);
  if ((count ?? 0) >= 20) adminRedirect("The league already has 20 active participants.");

  const { error } = await supabase.from("participants").insert({
    name,
    short_name: shortName || null,
  });
  if (error) adminRedirect(error.message);

  revalidatePath("/");
  adminRedirect(`${name} added to the table. They can register later using the same full name to link their account.`);
}

export async function addFixtureAction(formData: FormData) {
  await requireAdmin();
  const competition = String(formData.get("competition") ?? "").trim();
  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();

  try {
    const kickoff = trinidadDateTimeToIso(String(formData.get("kickoff") ?? ""));
    if (!competition || !homeTeam || !awayTeam) throw new Error("Complete all fixture fields.");

    const kickoffDate = new Date(kickoff);
    if (kickoffDate.getTime() <= Date.now()) throw new Error("Kickoff must be in the future.");

    const entryDeadline = new Date(kickoffDate.getTime() - 15 * 60 * 1000).toISOString();
    const supabase = await createClient();
    const { error } = await supabase.from("fixtures").insert({
      competition,
      home_team: homeTeam,
      away_team: awayTeam,
      kickoff,
      entry_deadline: entryDeadline,
      status: "scheduled",
    });
    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/fixtures");
    revalidatePath("/predictions");
    adminRedirect("Fixture added. Its prediction cutoff is automatically 15 minutes before kickoff.");
  } catch (error) {
    adminRedirect(error instanceof Error ? error.message : "Unable to add fixture.");
  }
}

export async function addPointsAction(formData: FormData) {
  await requireAdmin();
  const participantId = String(formData.get("participantId") ?? "");
  const fixtureId = String(formData.get("fixtureId") ?? "") || null;
  const eventType = String(formData.get("eventType") ?? "manual_adjustment");
  const points = Number(formData.get("points"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!participantId || !Number.isInteger(points) || points < -10 || points > 10) {
    adminRedirect("Choose a participant and enter points between -10 and 10.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("score_events").insert({
    participant_id: participantId,
    fixture_id: fixtureId,
    event_type: eventType,
    points,
    reason: reason || "Points entered by administrator",
  });
  if (error) adminRedirect(error.message);

  revalidatePath("/");
  adminRedirect("Points added and standings recalculated.");
}

export async function updateFixtureAction(formData: FormData) {
  await requireAdmin();
  const fixtureId = String(formData.get("fixtureId") ?? "");
  const status = String(formData.get("status") ?? "scheduled");
  const homeScoreRaw = String(formData.get("homeScore") ?? "").trim();
  const awayScoreRaw = String(formData.get("awayScore") ?? "").trim();
  const homeScore = homeScoreRaw === "" ? null : Number(homeScoreRaw);
  const awayScore = awayScoreRaw === "" ? null : Number(awayScoreRaw);

  if (!fixtureId) adminRedirect("Choose a fixture.");
  if ((homeScore !== null && !Number.isInteger(homeScore)) || (awayScore !== null && !Number.isInteger(awayScore))) {
    adminRedirect("Scores must be whole numbers.");
  }
  if (status === "completed" && (homeScore === null || awayScore === null)) {
    adminRedirect("Enter both scores before marking a fixture completed.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("fixtures")
    .update({ status, home_score: homeScore, away_score: awayScore })
    .eq("id", fixtureId);
  if (error) adminRedirect(error.message);

  revalidatePath("/");
  revalidatePath("/fixtures");
  revalidatePath("/predictions");
  adminRedirect("Fixture status and result updated.");
}

export async function updateRulesAction(formData: FormData) {
  await requireAdmin();
  const exactScorePoints = Number(formData.get("exactScorePoints"));
  const correctOutcomePoints = Number(formData.get("correctOutcomePoints"));
  const winnerOnlyPoints = Number(formData.get("winnerOnlyPoints"));
  const penaltyMode = String(formData.get("penaltyMode") ?? "pending");
  const entryNotes = String(formData.get("entryNotes") ?? "").trim();

  if (![exactScorePoints, correctOutcomePoints, winnerOnlyPoints].every(Number.isInteger)) {
    adminRedirect("Rule points must be whole numbers.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rules").upsert({
    id: 1,
    exact_score_points: exactScorePoints,
    correct_outcome_points: correctOutcomePoints,
    winner_only_points: winnerOnlyPoints,
    penalty_mode: penaltyMode,
    entry_notes: entryNotes,
  });
  if (error) adminRedirect(error.message);

  revalidatePath("/rules");
  adminRedirect("Rules updated.");
}

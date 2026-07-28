"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function predictionsRedirect(message: string): never {
  redirect(`/predictions?message=${encodeURIComponent(message)}`);
}

export async function savePredictionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?message=Sign%20in%20to%20enter%20a%20prediction.&next=%2Fpredictions");
  if (!user.participantId) predictionsRedirect("Your account is not linked to an active participant.");

  const fixtureId = String(formData.get("fixtureId") ?? "");
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (!fixtureId) predictionsRedirect("Choose a fixture.");
  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 30 ||
    awayScore > 30
  ) {
    predictionsRedirect("Scores must be whole numbers from 0 to 30.");
  }

  const supabase = await createClient();
  const { data: fixture, error: fixtureError } = await supabase
    .from("fixtures")
    .select("home_team, away_team, entry_deadline, status")
    .eq("id", fixtureId)
    .maybeSingle();

  if (fixtureError || !fixture) predictionsRedirect("That fixture could not be found.");

  const deadlinePassed = Date.now() >= new Date(fixture.entry_deadline).getTime();
  const statusAllowsEntries = fixture.status === "scheduled" || fixture.status === "open";
  if (deadlinePassed || !statusAllowsEntries) {
    predictionsRedirect("Entries are closed. Predictions lock 15 minutes before kickoff.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("predictions").upsert(
    {
      participant_id: user.participantId,
      fixture_id: fixtureId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      updated_at: now,
    },
    { onConflict: "participant_id,fixture_id" },
  );

  if (error) {
    const message = error.message.toLowerCase().includes("row-level security")
      ? "The prediction window has closed. No late entry was saved."
      : error.message;
    predictionsRedirect(message);
  }

  revalidatePath("/predictions");
  predictionsRedirect(
    `${fixture.home_team} ${homeScore}–${awayScore} ${fixture.away_team} saved successfully.`,
  );
}

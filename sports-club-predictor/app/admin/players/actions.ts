"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect(
      "/login?message=Administrator%20access%20required.&next=%2Fadmin%2Fplayers",
    );
  }

  return admin;
}

function normalizeName(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function redirectWithMessage(
  message: string,
  tone: "success" | "warning" | "danger" = "success",
): never {
  redirect(
    `/admin/players?message=${encodeURIComponent(message)}&tone=${tone}`,
  );
}

function revalidateParticipantPages() {
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/predictions");
  revalidatePath("/admin");
  revalidatePath("/admin/players");
}

export async function updateParticipantAction(formData: FormData) {
  await requireAdmin();

  const participantId = String(formData.get("participantId") ?? "");
  const name = normalizeName(formData.get("name"));
  const shortName = String(formData.get("shortName") ?? "")
    .trim()
    .toUpperCase();
  const active = String(formData.get("active") ?? "true") === "true";

  if (!participantId) {
    redirectWithMessage("Choose a participant to update.", "danger");
  }

  if (name.length < 2) {
    redirectWithMessage(
      "The participant name must contain at least two characters.",
      "danger",
    );
  }

  if (shortName.length > 4) {
    redirectWithMessage(
      "The initials or short name cannot be longer than four characters.",
      "danger",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_participant", {
    target_id: participantId,
    new_name: name,
    new_short_name: shortName || null,
    new_active: active,
  });

  if (error) {
    redirectWithMessage(error.message, "danger");
  }

  revalidateParticipantPages();
  redirectWithMessage(`${name}'s information was updated.`);
}

export async function setParticipantActiveAction(formData: FormData) {
  await requireAdmin();

  const participantId = String(formData.get("participantId") ?? "");
  const name = normalizeName(formData.get("name")) || "Participant";
  const shortName = String(formData.get("shortName") ?? "")
    .trim()
    .toUpperCase();
  const active = String(formData.get("active") ?? "false") === "true";

  if (!participantId) {
    redirectWithMessage("Choose a participant.", "danger");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_participant", {
    target_id: participantId,
    new_name: name,
    new_short_name: shortName || null,
    new_active: active,
  });

  if (error) {
    redirectWithMessage(error.message, "danger");
  }

  revalidateParticipantPages();

  redirectWithMessage(
    active
      ? `${name} was reactivated and can enter predictions again.`
      : `${name} was deactivated. Their history has been preserved.`,
    active ? "success" : "warning",
  );
}

export async function deleteParticipantAction(formData: FormData) {
  await requireAdmin();

  const participantId = String(formData.get("participantId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!participantId) {
    redirectWithMessage("Choose a participant to delete.", "danger");
  }

  if (confirmation !== "DELETE") {
    redirectWithMessage(
      'Type the word "DELETE" exactly before permanently deleting a participant.',
      "danger",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_participant", {
    target_id: participantId,
    confirmation_text: confirmation,
  });

  if (error) {
    redirectWithMessage(error.message, "danger");
  }

  revalidateParticipantPages();

  const result = data as
    | {
        name?: string;
        predictions_deleted?: number;
        score_events_deleted?: number;
      }
    | null;

  const deletedName = result?.name || "The participant";
  const predictionCount = result?.predictions_deleted ?? 0;
  const eventCount = result?.score_events_deleted ?? 0;

  redirectWithMessage(
    `${deletedName} was permanently deleted with ${predictionCount} prediction(s) and ${eventCount} score record(s). The login account, if any, was not deleted.`,
    "danger",
  );
}

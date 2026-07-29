import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  deleteParticipantAction,
  setParticipantActiveAction,
  updateParticipantAction,
} from "./actions";

export const dynamic = "force-dynamic";

type ParticipantRow = {
  id: string;
  name: string;
  short_name: string | null;
  active: boolean;
  created_at: string;
};

export default async function ManagePlayersPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    tone?: "success" | "warning" | "danger";
  }>;
}) {
  const { message, tone = "success" } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main className="page-width page-top section-block">
        <div className="content-card admin-alert admin-alert-warning">
          <h1>Supabase setup required</h1>
          <p>Configure Supabase before managing real participants.</p>
        </div>
      </main>
    );
  }

  const admin = await getAdminUser();
  if (!admin) {
    redirect(
      "/login?message=Administrator%20access%20required.&next=%2Fadmin%2Fplayers",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, short_name, active, created_at")
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const participants = (data ?? []) as ParticipantRow[];
  const activeCount = participants.filter((participant) => participant.active)
    .length;
  const inactiveCount = participants.length - activeCount;

  return (
    <main className="page-width page-top section-block player-management-page">
      <header className="admin-heading">
        <div>
          <p className="eyebrow dark">PLAYER ADMINISTRATION</p>
          <h1>Manage participants</h1>
          <p>
            {activeCount}/20 active players · {inactiveCount} inactive
          </p>
        </div>

        <div className="admin-heading-actions">
          <Link className="button button-secondary" href="/admin">
            Back to Admin Portal
          </Link>
          <Link className="button button-primary" href="/admin#add-participant">
            Add a participant
          </Link>
        </div>
      </header>

      {message && (
        <div
          className={`admin-alert admin-alert-${tone}`}
          role="status"
        >
          <strong>
            {tone === "danger"
              ? "Important:"
              : tone === "warning"
                ? "Status changed:"
                : "Success:"}
          </strong>{" "}
          {message}
        </div>
      )}

      <section className="admin-alert admin-alert-info">
        <h2>Recommended removal process</h2>
        <p>
          Use <strong>Deactivate</strong> for a player who leaves the league.
          Their predictions and points remain in the database. Use permanent
          deletion only for duplicates, mistakes, or unused test accounts.
        </p>
      </section>

      {participants.length === 0 ? (
        <section className="content-card empty-state">
          <h2>No participants yet</h2>
          <p>Add the first participant from the Admin Portal.</p>
        </section>
      ) : (
        <section className="participant-management-list">
          {participants.map((participant) => (
            <article
              className={`participant-management-card ${
                participant.active ? "is-active" : "is-inactive"
              }`}
              key={participant.id}
            >
              <div className="participant-management-heading">
                <div>
                  <span
                    className={`player-status-badge ${
                      participant.active
                        ? "player-status-active"
                        : "player-status-inactive"
                    }`}
                  >
                    {participant.active ? "Active player" : "Inactive player"}
                  </span>
                  <h2>{participant.name}</h2>
                  <p>
                    Short name: {participant.short_name || "Not set"}
                  </p>
                </div>
              </div>

              <form
                action={updateParticipantAction}
                className="participant-edit-form"
              >
                <input
                  name="participantId"
                  type="hidden"
                  value={participant.id}
                />
                <input
                  name="active"
                  type="hidden"
                  value={String(participant.active)}
                />

                <label>
                  Full name
                  <input
                    name="name"
                    defaultValue={participant.name}
                    minLength={2}
                    required
                  />
                </label>

                <label>
                  Initials or short name
                  <input
                    name="shortName"
                    defaultValue={participant.short_name ?? ""}
                    maxLength={4}
                    placeholder="AB"
                  />
                </label>

                <button className="button button-primary" type="submit">
                  Save player information
                </button>
              </form>

              <div className="participant-status-actions">
                <div>
                  <h3>League status</h3>
                  <p>
                    {participant.active
                      ? "Deactivation removes the player from active standings and blocks future predictions while preserving history."
                      : "Reactivation returns the player to the active league if fewer than 20 places are filled."}
                  </p>
                </div>

                <form action={setParticipantActiveAction}>
                  <input
                    name="participantId"
                    type="hidden"
                    value={participant.id}
                  />
                  <input name="name" type="hidden" value={participant.name} />
                  <input
                    name="shortName"
                    type="hidden"
                    value={participant.short_name ?? ""}
                  />
                  <input
                    name="active"
                    type="hidden"
                    value={String(!participant.active)}
                  />

                  <button
                    className={`button ${
                      participant.active ? "button-warning" : "button-success"
                    }`}
                    type="submit"
                  >
                    {participant.active
                      ? "Deactivate player"
                      : "Reactivate player"}
                  </button>
                </form>
              </div>

              <div className="participant-danger-zone">
                <div>
                  <p className="danger-label">DANGER ZONE</p>
                  <h3>Permanently delete participant</h3>
                  <p>
                    This permanently removes the participant, their
                    predictions, and their score records. It does not delete
                    their Supabase login account. This cannot be undone.
                  </p>
                </div>

                <form action={deleteParticipantAction} className="delete-player-form">
                  <input
                    name="participantId"
                    type="hidden"
                    value={participant.id}
                  />
                  <label>
                    Type DELETE to confirm
                    <input
                      name="confirmation"
                      autoComplete="off"
                      placeholder="DELETE"
                      required
                    />
                  </label>
                  <button className="button button-danger" type="submit">
                    Delete permanently
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

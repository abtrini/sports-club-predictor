import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteParticipantAction,
  setParticipantActiveAction,
  updateParticipantAction,
  updateParticipantAdminRoleAction,
} from "./actions";

export const dynamic = "force-dynamic";

type ParticipantRow = {
  id: string;
  user_id: string | null;
  name: string;
  short_name: string | null;
  active: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  role: "member" | "admin";
};

type ManagedParticipant = ParticipantRow & {
  accountRole: "member" | "admin" | null;
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

  const supabase = createAdminClient();
  const [participantResponse, profileResponse] = await Promise.all([
    supabase
      .from("participants")
      .select("id, user_id, name, short_name, active, created_at")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase.from("profiles").select("id, role"),
  ]);

  if (participantResponse.error) {
    throw new Error(participantResponse.error.message);
  }

  if (profileResponse.error) {
    throw new Error(profileResponse.error.message);
  }

  const roleByUserId = new Map(
    ((profileResponse.data ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.role,
    ]),
  );

  const participants: ManagedParticipant[] = (
    (participantResponse.data ?? []) as ParticipantRow[]
  ).map((participant) => ({
    ...participant,
    accountRole: participant.user_id
      ? (roleByUserId.get(participant.user_id) ?? null)
      : null,
  }));

  const activeCount = participants.filter(
    (participant) => participant.active,
  ).length;
  const inactiveCount = participants.length - activeCount;
  const adminCount = participants.filter(
    (participant) => participant.accountRole === "admin",
  ).length;

  return (
    <main className="page-width page-top section-block player-management-page">
      <header className="admin-heading">
        <div>
          <p className="eyebrow dark">PLAYER ADMINISTRATION</p>
          <h1>Manage participants</h1>
          <p>
            {activeCount}/20 active players · {inactiveCount} inactive ·{" "}
            {adminCount} player administrator{adminCount === 1 ? "" : "s"}
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
        <div className={`admin-alert admin-alert-${tone}`} role="status">
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
        <h2>Administrator protection</h2>
        <p>
          Only registered players can receive administrator rights. An
          administrator cannot permanently delete another administrator. Your
          own admin rights and the final remaining admin account are also
          protected from removal.
        </p>
      </section>

      {participants.length === 0 ? (
        <section className="content-card empty-state">
          <h2>No participants yet</h2>
          <p>Add the first participant from the Admin Portal.</p>
        </section>
      ) : (
        <section className="participant-management-list">
          {participants.map((participant) => {
            const isParticipantAdmin = participant.accountRole === "admin";
            const isCurrentAdmin = participant.user_id === admin.id;

            return (
              <article
                className={`participant-management-card ${
                  participant.active ? "is-active" : "is-inactive"
                } ${isParticipantAdmin ? "is-administrator" : ""}`}
                key={participant.id}
              >
                <div className="participant-management-heading">
                  <div>
                    <div className="player-badge-row">
                      <span
                        className={`player-status-badge ${
                          participant.active
                            ? "player-status-active"
                            : "player-status-inactive"
                        }`}
                      >
                        {participant.active
                          ? "Active player"
                          : "Inactive player"}
                      </span>

                      {isParticipantAdmin && (
                        <span className="player-admin-badge">
                          Administrator
                        </span>
                      )}

                      {!participant.user_id && (
                        <span className="player-registration-badge">
                          Not registered
                        </span>
                      )}
                    </div>

                    <h2>{participant.name}</h2>
                    <p>Short name: {participant.short_name || "Not set"}</p>
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

                <div className="participant-admin-access">
                  <div>
                    <p className="admin-access-label">ADMIN ACCESS</p>
                    <h3>
                      {isParticipantAdmin
                        ? "Administrator permissions active"
                        : "Standard player account"}
                    </h3>
                    <p>
                      {!participant.user_id
                        ? "This player must register and link their login account before admin rights can be granted."
                        : isCurrentAdmin
                          ? "This is the account you are currently using. You cannot remove your own admin rights here."
                          : isParticipantAdmin
                            ? "This player can access the Admin Portal and manage the competition."
                            : "Grant access only to a trusted committee member who should manage fixtures, players, results and rules."}
                    </p>
                  </div>

                  {participant.user_id && !isCurrentAdmin && (
                    <form action={updateParticipantAdminRoleAction}>
                      <input
                        name="participantId"
                        type="hidden"
                        value={participant.id}
                      />
                      <input
                        name="newRole"
                        type="hidden"
                        value={isParticipantAdmin ? "member" : "admin"}
                      />
                      <button
                        className={`button ${
                          isParticipantAdmin
                            ? "button-warning"
                            : "button-secondary"
                        }`}
                        type="submit"
                      >
                        {isParticipantAdmin
                          ? "Remove admin rights"
                          : "Make administrator"}
                      </button>
                    </form>
                  )}
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

                  {isParticipantAdmin ? (
                    <div className="admin-delete-protected" role="note">
                      <strong>Deletion blocked</strong>
                      <span>
                        Administrators cannot be deleted while admin rights are
                        active.
                      </span>
                    </div>
                  ) : (
                    <form
                      action={deleteParticipantAction}
                      className="delete-player-form"
                    >
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
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

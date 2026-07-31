import Link from "next/link";

import { getStandings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const standings = await getStandings();

  return (
    <main className="page-width page-top section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark">PLAYER PROFILES</p>
          <h1>Meet the league</h1>
          <p>
            Open a participant&apos;s profile to see current rank,
            scoring breakdown, recent form and personal records.
          </p>
        </div>

        <Link href="/standings">View standings →</Link>
      </div>

      {standings.length > 0 ? (
        <div className="player-directory-grid">
          {standings.map((standing, index) => (
            <Link
              className="player-directory-card"
              href={`/players/${standing.id}`}
              key={standing.id}
            >
              <span className="profile-avatar profile-avatar-small">
                {standing.shortName?.slice(0, 2) ||
                  standing.name.slice(0, 2)}
              </span>

              <div>
                <small>Position #{index + 1}</small>
                <strong>{standing.name}</strong>
                <span>
                  {standing.points} points · {standing.exactHits}{" "}
                  exact
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="content-card empty-state">
          <h2>No player profiles yet</h2>
          <p>
            Profiles will appear after participants are added to
            the competition.
          </p>
        </div>
      )}
    </main>
  );
}

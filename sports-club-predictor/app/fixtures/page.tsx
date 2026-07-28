import Link from "next/link";
import { FixtureCard } from "@/components/FixtureCard";
import { getFixtures } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const fixtures = await getFixtures();

  return (
    <section className="page-width page-top section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark">ADMIN-SELECTED GAMES</p>
          <h1>Fixtures and cutoffs</h1>
        </div>
        <p>All times are shown in Trinidad and Tobago time.</p>
      </div>
      <div className="notice">
        Predictions lock automatically <strong>15 minutes before kickoff</strong>. Players may save or revise their scores before that time.
      </div>
      <div className="fixture-page-actions">
        <Link className="button button-primary" href="/predictions">Enter my predictions</Link>
        <Link className="button button-secondary" href="/register">Register as a player</Link>
      </div>
      <div className="fixture-grid">
        {fixtures.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} />)}
      </div>
    </section>
  );
}

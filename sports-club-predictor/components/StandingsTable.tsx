import type { Standing } from "@/lib/types";

export function StandingsTable({ standings }: { standings: Standing[] }) {
  const total = standings.length;

  return (
    <div className="table-shell">
      <div className="standings-legend" aria-label="Standings colour legend">
        <span><i className="legend-dot promoted" /> Top four</span>
        <span><i className="legend-dot relegated" /> Bottom five</span>
      </div>
      <div className="table-scroll">
        <table className="standings-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Participant</th>
              <th title="Fixtures scored">P</th>
              <th title="Exact score predictions">Exact</th>
              <th title="Correct match outcomes">Result</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((participant, index) => {
              const position = index + 1;
              const isPromoted = position <= 4;
              const isRelegated = total >= 9 && position > total - 5;
              const rowClass = isPromoted ? "row-promoted" : isRelegated ? "row-relegated" : "";

              return (
                <tr key={participant.id} className={rowClass}>
                  <td><strong>{position}</strong></td>
                  <td>
                    <div className="participant-cell">
                      <span className="avatar">{participant.shortName?.slice(0, 2) || participant.name.slice(0, 2)}</span>
                      <span>{participant.name}</span>
                    </div>
                  </td>
                  <td>{participant.played}</td>
                  <td>{participant.exactHits}</td>
                  <td>{participant.correctOutcomes}</td>
                  <td className="points-cell">{participant.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

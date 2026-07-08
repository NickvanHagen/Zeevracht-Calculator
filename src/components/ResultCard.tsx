import { SummaryRow } from './SummaryRow';
import type { ResultLine } from '../types/result';
import type { ReactNode } from 'react';

type ResultCardProps = {
  children?: ReactNode;
  title: string;
  rows: ResultLine[];
};

export function ResultCard({ children, title, rows }: ResultCardProps) {
  const primaryLabels = ['Laadmeters', 'Werkelijk gewicht', 'Betalend gewicht'];
  const primaryRows = rows.filter((row) => primaryLabels.includes(row.label));
  const detailRows = rows.filter((row) => !primaryLabels.includes(row.label));
  const groupedRows = detailRows.reduce<Array<{ section: string; rows: ResultLine[] }>>((groups, row) => {
    const section = row.section ?? 'Kosten';
    const existingGroup = groups.find((group) => group.section === section);

    if (existingGroup) {
      existingGroup.rows.push(row);
      return groups;
    }

    return [...groups, { rows: [row], section }];
  }, []);

  return (
    <aside className="result-card">
      <div className="result-header">
        <p>Resultaat</p>
        <h2>{title}</h2>
      </div>
      {primaryRows.length > 0 ? (
        <div className="result-metrics">
          {primaryRows.map((row) => (
            <div className={row.emphasis ? 'result-metric total' : 'result-metric'} key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <div className="result-sections">
        {groupedRows.map((group) => (
          <section className="result-section" key={group.section}>
            <h3>{group.section}</h3>
            <div className="summary-list">
              {group.rows.map((row) => (
                <SummaryRow emphasis={row.emphasis} key={`${group.section}-${row.label}`} label={row.label} value={row.value} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {children}
    </aside>
  );
}

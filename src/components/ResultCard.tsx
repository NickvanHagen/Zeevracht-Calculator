import { SummaryRow } from './SummaryRow';
import type { ResultLine } from '../types/result';
import type { ReactNode } from 'react';

type ResultCardProps = {
  actions?: ReactNode;
  children?: ReactNode;
  commercialSummary?: ReactNode;
  quoteNumber?: string;
  salesPrice?: string;
  title: string;
  totalPurchase?: string;
  rows: ResultLine[];
};

const sectionLabels: Record<string, string> = {
  Zeevracht: 'NVO kosten',
  Transport: 'Transport',
  Douane: 'Douane',
  'Overige toeslagen': 'Overige toeslagen',
  Totaal: 'Totaal',
};

const defaultOpenSections = new Set(['NVO kosten', 'Transport']);

export function ResultCard({
  actions,
  children,
  commercialSummary,
  quoteNumber,
  salesPrice,
  title,
  totalPurchase,
  rows,
}: ResultCardProps) {
  const primaryLabels = ['Laadmeters', 'Werkelijk gewicht', 'Betalend gewicht'];
  const primaryRows = rows.filter((row) => primaryLabels.includes(row.label));
  const detailRows = rows.filter((row) => !primaryLabels.includes(row.label) && row.section !== 'Totaal');
  const groupedRows = detailRows.reduce<Array<{ section: string; rows: ResultLine[] }>>((groups, row) => {
    const section = sectionLabels[row.section ?? 'Kosten'] ?? row.section ?? 'Kosten';
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
      <div className="result-top-summary">
        <div>
          <span>Totaal inkoop</span>
          <strong>{totalPurchase ?? '-'}</strong>
        </div>
        <div className="sales">
          <span>Verkoopprijs</span>
          <strong>{salesPrice ?? '-'}</strong>
        </div>
        {commercialSummary}
        <div>
          <span>Offertenummer</span>
          <strong>{quoteNumber || 'Nog niet opgeslagen'}</strong>
        </div>
      </div>
      {actions ? <div className="result-primary-actions">{actions}</div> : null}
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
          <details className="result-section" key={group.section} open={defaultOpenSections.has(group.section)}>
            <summary>{group.section}</summary>
            <div className="summary-list">
              {group.rows.map((row) => (
                <SummaryRow emphasis={row.emphasis} key={`${group.section}-${row.label}`} label={row.label} value={row.value} />
              ))}
            </div>
          </details>
        ))}
      </div>
      {children}
    </aside>
  );
}

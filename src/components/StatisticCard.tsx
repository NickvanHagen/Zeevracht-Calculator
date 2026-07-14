import type { ReactNode } from 'react';

type StatisticCardProps = {
  accent: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  icon: ReactNode;
  label: string;
  subValue?: string;
  value: string;
};

export function StatisticCard({ accent, icon, label, subValue, value }: StatisticCardProps) {
  return (
    <article className={`stat-card stat-card-${accent}`}>
      <div className="stat-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {subValue ? <small>{subValue}</small> : null}
      </div>
    </article>
  );
}

import type { ReactNode } from 'react';

type StatisticCardProps = {
  accent: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  icon: ReactNode;
  label: string;
  sparkline?: number[];
  subValue?: string;
  value: string;
};

const buildSparklinePoints = (values: number[]) => {
  if (values.length === 0) {
    return '';
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 100 : (index / (values.length - 1)) * 100;
      const y = 34 - ((value - min) / range) * 28;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
};

export function StatisticCard({ accent, icon, label, sparkline, subValue, value }: StatisticCardProps) {
  const points = sparkline ? buildSparklinePoints(sparkline) : '';

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
      {points ? (
        <svg aria-hidden="true" className="stat-sparkline" preserveAspectRatio="none" viewBox="0 0 100 40">
          <polyline fill="none" points={points} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        </svg>
      ) : null}
    </article>
  );
}

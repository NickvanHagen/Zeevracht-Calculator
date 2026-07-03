type SummaryRowProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export function SummaryRow({ label, value, emphasis = false }: SummaryRowProps) {
  return (
    <div className={emphasis ? 'summary-row total' : 'summary-row'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

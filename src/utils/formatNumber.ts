export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('nl-NL', {
    maximumFractionDigits,
    minimumFractionDigits: value > 0 && maximumFractionDigits > 0 ? 2 : 0,
  }).format(value);
}

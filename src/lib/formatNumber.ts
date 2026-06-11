export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

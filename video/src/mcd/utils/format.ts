// Number / currency formatting helpers.
// Kept separate from the data so presentation details never leak into data.

const trim = (n: number): string => {
  const s = n.toFixed(1);
  return s.replace(/\.0$/, "");
};

export const formatInteger = (v: number): string =>
  new Intl.NumberFormat("en-US").format(Math.round(v));

export const formatCompactNumber = (v: number): string => {
  if (v >= 1e9) return `${trim(v / 1e9)}B`;
  if (v >= 1e6) return `${trim(v / 1e6)}M`;
  if (v >= 1e3) return `${trim(v / 1e3)}K`;
  return formatInteger(v);
};

export const formatCompactMoney = (v: number): string => {
  if (v === 0) return "$0";
  if (v >= 1e9) return `$${trim(v / 1e9)}B`;
  if (v >= 1e6) return `$${trim(v / 1e6)}M`;
  if (v >= 1e3) return `$${trim(v / 1e3)}K`;
  return `$${Math.round(v)}`;
};
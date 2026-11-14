/** Números y fechas como en el panel original de Rumbo: en español de España. */

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurosExactos = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const pct = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' });

export function fmtEuros(x: number | null | undefined, exacto = false) {
  if (x == null || !Number.isFinite(x)) return '—';
  return (exacto ? eurosExactos : euros).format(x);
}

/** Recibe tantos por uno (0.1843 → «+18,4 %»), como los da el motor. */
export function fmtPct(x: number | null | undefined) {
  if (x == null || !Number.isFinite(x)) return '—';
  return pct.format(x);
}

export function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

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

/** Unidades o participaciones: hasta 6 decimales, sin ceros de sobra. */
export function fmtUnidades(x: number | null | undefined) {
  if (x == null || !Number.isFinite(x)) return '—';
  return x.toLocaleString('es-ES', { maximumFractionDigits: 6 });
}

/**
 * Número escrito a la española, igual que num_es en app/motor.py de Rumbo:
 * «1.234,56», «1234,5», «12.5» o «1.000» (mil). null si no es un número.
 */
export function numEs(texto: string | null | undefined): number | null {
  let t = (texto ?? '').replace(/[\s €%]/g, '');
  if (!t || !/^-?[\d.,]+$/.test(t)) return null;
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const x = Number(t);
  return Number.isFinite(x) ? x : null;
}

/** Hoy (o hace `dias` días) en ISO, con la fecha local del teléfono. */
export function hoyISO(dias = 0) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** «13/9/2026», «13/09/26», «13-9-2026» o «2026-09-13» → «2026-09-13». null si no es una fecha real. */
export function fechaDesdeTexto(texto: string): string | null {
  const t = texto.trim();
  let a: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const es = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
  if (iso) [a, m, d] = [+iso[1], +iso[2], +iso[3]];
  else if (es) [d, m, a] = [+es[1], +es[2], es[3].length === 2 ? 2000 + +es[3] : +es[3]];
  else return null;
  const f = new Date(Date.UTC(a, m - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return f.toISOString().slice(0, 10);
}

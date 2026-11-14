/**
 * Cálculos de los gráficos, sin dibujar nada. Portados de app/web/graficos.js y app/web/app.js
 * de Rumbo (Dani Dominguez Quant, github.com/danidm98/rumbo) para que la app pinte igual que la web.
 * Sin dependencias (ni React ni Expo): se prueban con `node --test`.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Escala «bonita» para ~5 líneas de rejilla (escalaBonita en graficos.js). */
export function escalaBonita(max: number, min = 0) {
  if (max <= min) max = min + 1;
  const bruto = (max - min) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const norm = bruto / mag;
  const paso = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(max / paso) * paso, min: Math.floor(min / paso) * paso, paso };
}

/** Las líneas de la rejilla entre min y max. */
export function lineasRejilla(e: { max: number; min: number; paso: number }) {
  const out: number[] = [];
  for (let v = e.min; v <= e.max + e.paso * 1e-9; v += e.paso) out.push(v);
  return out;
}

/** Índices repartidos para las etiquetas del eje X (indicesEjeX). */
export function indicesEjeX(n: number, cuantos: number) {
  if (n <= 1) return [0];
  const k = Math.min(cuantos, n);
  const out: number[] = [];
  for (let i = 0; i < k; i++) out.push(Math.round((i * (n - 1)) / (k - 1)));
  return [...new Set(out)];
}

/** «ene 25» en rangos largos; «3 ene» en los cortos (etiquetaEjeX). */
export function etiquetaEjeX(fecha: string, n: number) {
  const [a, m, d] = fecha.split('-');
  return n > 70 ? `${MESES[+m - 1]} ${a.slice(2)}` : `${+d} ${MESES[+m - 1]}`;
}

/** «sep 2026» para un mes «2026-09». */
export function etiquetaMes(ym: string) {
  const [a, m] = ym.split('-');
  return `${MESES[+m - 1]} ${a}`;
}

/** Euros cortos para los ejes: 950 €, 12,5k €, 1,2 M€ (fmtEurCorto). */
export function fmtEurCorto(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' mil M€';
  if (a >= 1e6) return (v / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' M€';
  if (a >= 1000) return (v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + 'k €';
  return Math.round(v) + ' €';
}

// ---------------------------------------------------------------- periodo (rango temporal)

export type Rango = '1m' | '3m' | '6m' | 'ytd' | '1a' | 'todo';

export const RANGOS: { id: Rango; et: string; dias: number | null }[] = [
  { id: '1m', et: '1M', dias: 30 },
  { id: '3m', et: '3M', dias: 91 },
  { id: '6m', et: '6M', dias: 182 },
  { id: 'ytd', et: 'YTD', dias: null },
  { id: '1a', et: '1A', dias: 365 },
  { id: 'todo', et: 'Todo', dias: null },
];

/** Primer índice de `fechas` que entra en el rango (desdeIdx en app.js). */
export function desdeIdx(fechas: string[], fechaExtracto: string, rango: Rango) {
  const n = fechas.length;
  const r = RANGOS.find((x) => x.id === rango);
  if (!r || r.id === 'todo') return 0;
  if (r.id === 'ytd') {
    const ini = fechaExtracto.slice(0, 4) + '-01-01';
    const i = fechas.findIndex((f) => f >= ini);
    return i < 0 ? 0 : i;
  }
  return Math.max(0, n - 1 - (r.dias as number));
}

// ---------------------------------------------------------------- trazados SVG

/**
 * Trazado de una serie con huecos (null corta la línea). `x(i)` e `y(v)` pasan a píxeles.
 * Devuelve también el primer y último índice con dato, para cerrar el área.
 */
export function trazado(valores: (number | null | undefined)[], x: (i: number) => number, y: (v: number) => number) {
  let d = '';
  let abierto = false;
  let primero: number | null = null;
  let ultimo: number | null = null;
  valores.forEach((v, i) => {
    if (v == null) {
      abierto = false;
      return;
    }
    if (primero === null) primero = i;
    ultimo = i;
    d += (abierto ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' ';
    abierto = true;
  });
  return { d: d.trim(), primero, ultimo };
}

/** Sector de un donut entre los ángulos a0 y a1 (radianes), de radio exterior R e interior r0. */
export function arcoDonut(cx: number, cy: number, R: number, r0: number, a0: number, a1: number) {
  // Un sector de 360° exactos no se puede dibujar con un solo arco: se deja un pelo sin cerrar.
  if (a1 - a0 >= Math.PI * 2) a1 = a0 + Math.PI * 2 - 1e-4;
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(R, a0)} A${R} ${R} 0 ${grande} 1 ${p(R, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${grande} 0 ${p(r0, a0)} Z`;
}

/** Índice del punto más cercano a la posición x (en píxeles) dentro del área de dibujo. */
export function indiceEn(px: number, izquierda: number, ancho: number, n: number) {
  if (n <= 1) return 0;
  const i = Math.round(((px - izquierda) / ancho) * (n - 1));
  return Math.min(n - 1, Math.max(0, i));
}

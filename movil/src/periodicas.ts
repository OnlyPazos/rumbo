/**
 * Aportaciones periódicas que toca anotar: las que caen después de la última añadida y hasta hoy
 * (el día elegido de cada mes; en meses más cortos, el último día). Portado tal cual de
 * periodicasPendientes en app/web/calculos.js de Rumbo (Dani Dominguez Quant), con sus mismas pruebas.
 * Sin dependencias: se prueba con `node --test`.
 */

/** Lo que Rumbo recuerda de cada periódica (cartera.json → periodicas). */
export interface Periodica {
  producto: string;
  importe: number;
  dia: number;
  /** La última fecha añadida (AAAA-MM-DD). */
  ultima: string;
}

export interface Pendiente {
  producto: string;
  importe: number;
  dia: number;
  /** La primera que falta. */
  desde: string;
  cuantas: number;
}

export function periodicasPendientes(periodicas: unknown, idsProductos: string[], hoy: string): Pendiente[] {
  const dos = (n: number) => String(n).padStart(2, '0');
  const out: Pendiente[] = [];
  (Array.isArray(periodicas) ? periodicas : []).forEach((r: Partial<Periodica> | null) => {
    if (!r || !idsProductos.includes(r.producto as string) || !/^\d{4}-\d{2}-\d{2}$/.test(r.ultima || '')) return;
    const dia = Math.min(Math.max(parseInt(String(r.dia), 10) || 1, 1), 31);
    let [a, m] = (r.ultima as string).split('-').map(Number);
    let primera: string | null = null;
    let cuantas = 0;
    for (let i = 0; i < 600; i++) {
      m += 1;
      if (m > 12) {
        m = 1;
        a += 1;
      }
      const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
      const f = `${a}-${dos(m)}-${dos(Math.min(dia, ultimoDia))}`;
      if (f > hoy) break;
      primera = primera || f;
      cuantas += 1;
    }
    if (cuantas) out.push({ producto: r.producto as string, importe: Number(r.importe) || 0, dia, desde: primera as string, cuantas });
  });
  return out;
}

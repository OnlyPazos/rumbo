/**
 * Liquidez, fondo de emergencia y reparto objetivo: portado tal cual de app/web/calculos.js de Rumbo
 * (Dani Dominguez Quant), con sus mismas pruebas (tests/calculos.test.mts). Sin dependencias.
 *
 * Los productos son los calculados del panel (tipoClave, clase, valor, liquidez, largoPlazo…).
 */

/** Lo mínimo de un producto que usan estas cuentas. */
export interface ProductoParaCalculo {
  id?: string;
  corto?: string;
  nombre?: string;
  tipo?: string;
  tipoClave?: string;
  clase?: string;
  valor?: number;
  liquidez?: boolean | null;
  largoPlazo?: boolean;
  exposicion?: Exposicion | null;
}

/** Qué hay dentro de un fondo o ETF: reparto por países y sectores en % (de Morningstar o de la ficha del índice). */
export interface Exposicion {
  /** Parte en bolsa del producto (1 si no se dice: todo). */
  rv?: number | null;
  paises?: [string, number][];
  sectores?: [string, number][];
  top10?: [string, number][];
  actualizado?: string;
  fuente?: string;
  constituyentes?: number;
  /** Es una sola empresa (una acción). */
  empresa?: boolean;
}

type ValorDe<P> = (p: P) => number;
const valorPorDefecto = (p: ProductoParaCalculo) => p.valor || 0;

// ---------------------------------------------------------------- dónde está tu dinero (países y sectores)

const FUERA_DE_BOLSA = ['efectivo', 'cripto', 'commodity', 'inmueble', 'bono', 'p2p'];

/**
 * Suma el reparto por países y sectores de cada producto según lo que vale. Solo la
 * parte en bolsa de cada uno (rv); lo demás va a «fuera», y lo que no tiene datos a
 * «sinDatos». Devuelve los 9 mayores y «Otros», en % de lo que tienes en bolsa.
 */
export function agregaExposicion<P extends ProductoParaCalculo>(lista: P[], valorDe: ValorDe<P> = valorPorDefecto) {
  let enBolsa = 0;
  let fuera = 0;
  let sinDatos = 0;
  const paises = new Map<string, number>();
  const sectores = new Map<string, number>();
  const sinNombre: string[] = [];
  const suma = (m: Map<string, number>, n: string, v: number) => m.set(n, (m.get(n) || 0) + v);
  lista.forEach((p) => {
    const v = valorDe(p);
    if (!(v > 0)) return;
    const e = p.exposicion;
    // Cuentas, cripto, oro, pisos…: no están en bolsa aunque no tengan ficha.
    if (!e && FUERA_DE_BOLSA.includes(p.tipoClave ?? '')) {
      fuera += v;
      return;
    }
    if (!e) {
      sinDatos += v;
      sinNombre.push(p.corto || p.nombre || '');
      return;
    }
    const rv = e.rv == null ? 1 : e.rv;
    const vb = v * rv;
    enBolsa += vb;
    fuera += v - vb;
    (e.paises || []).forEach(([n, pct]) => suma(paises, n === 'Resto' ? 'Otros' : n, (vb * pct) / 100));
    (e.sectores || []).forEach(([n, pct]) => suma(sectores, n === 'Resto' ? 'Otros' : n, (vb * pct) / 100));
  });
  const ordena = (m: Map<string, number>): [string, number][] => {
    if (!(enBolsa > 0)) return [];
    const filas = [...m.entries()].filter(([n]) => n !== 'Otros').sort((a, b) => b[1] - a[1]);
    const otros = (m.get('Otros') || 0) + filas.slice(9).reduce((a, x) => a + x[1], 0);
    return filas.slice(0, 9).concat(otros > 0 ? [['Otros', otros]] : []).map(([n, v]) => [n, +((v / enBolsa) * 100).toFixed(1)]);
  };
  return { enBolsa, fuera, sinDatos, sinNombre, paises: ordena(paises), sectores: ordena(sectores) };
}

// ---------------------------------------------------------------- liquidez y fondo de emergencia

/** Liquidez: lo que puedes tener en el banco en días (cuentas y monetarios, o lo que marques). */
export const esLiquidez = (p: ProductoParaCalculo) => (p.liquidez != null ? !!p.liquidez
  : p.tipoClave === 'efectivo' || /monetari/i.test([p.clase, p.nombre, p.tipo].join(' ')));

export interface ColchonCalculado {
  modo: 'meses' | 'importe';
  importe: number;
  meses?: number;
  gastoMensual?: number;
}

export function resumenLiquidez<P extends ProductoParaCalculo>(lista: P[], colchon: ColchonCalculado | null | undefined, valorDe: ValorDe<P> = valorPorDefecto) {
  const productos = lista.filter((p) => esLiquidez(p) && valorDe(p) > 0).sort((a, b) => valorDe(b) - valorDe(a));
  const liquidez = productos.reduce((a, p) => a + valorDe(p), 0);
  const r = {
    productos, liquidez,
    objetivo: null as number | null, cubierto: null as number | null, sobra: null as number | null,
    meses: null as number | null, pct: null as number | null,
  };
  if (!colchon || !(colchon.importe > 0)) return r;
  r.objetivo = colchon.importe;
  r.cubierto = Math.min(liquidez, colchon.importe);
  r.sobra = liquidez - colchon.importe;
  r.meses = colchon.modo === 'meses' && colchon.gastoMensual ? liquidez / colchon.gastoMensual : null;
  r.pct = Math.min(1, liquidez / colchon.importe);
  return r;
}

// ---------------------------------------------------------------- reparto objetivo y rebalanceo

// Por tipo de activo, pocos cubos y claros: la categoría de Morningstar («RV Global Emergente»,
// «Mercado Monetario Corto Plazo EUR»…) es demasiado fina y parte la bolsa en trozos.
export const TIPOS_REPARTO = ['Renta variable', 'Renta fija', 'Mixtos', 'Monetario', 'Efectivo', 'Criptoactivos',
  'Materias primas', 'Inmuebles', 'P2P y crowdfunding', 'Planes de pensiones', 'Otros'];
const POR_TEXTO: [RegExp, string][] = [
  [/monetari|money market|liquidez/i, 'Monetario'],
  [/mixt|allocation|multiactivo/i, 'Mixtos'],
  [/^rf\b|renta fija|bond|bonos|fixed income|deuda/i, 'Renta fija'],
  [/^rv\b|renta variable|equity|acciones|bolsa|stock/i, 'Renta variable'],
  [/inmobiliari|property|real estate|inmueble/i, 'Inmuebles'],
  [/commodit|materias primas|metales|oro\b|gold/i, 'Materias primas'],
  [/cripto|crypto/i, 'Criptoactivos'],
  [/efectivo|^cuentas?\b/i, 'Efectivo'],
  [/p2p|crowdfunding/i, 'P2P y crowdfunding'],
  [/jubilaci|pensi/i, 'Planes de pensiones'],
];
const tipoDeTexto = (t: string | undefined) =>
  (TIPOS_REPARTO.includes(t as string) ? t : (POR_TEXTO.find(([re]) => re.test(t || '')) || [])[1]) || null;
const POR_TIPO: Record<string, string> = {
  cripto: 'Criptoactivos', efectivo: 'Efectivo', inmueble: 'Inmuebles', p2p: 'P2P y crowdfunding',
  commodity: 'Materias primas', bono: 'Renta fija', accion: 'Renta variable',
};

/** El cubo de un producto: por su tipo, si lo dice todo; si no, por su categoría. */
export function tipoReparto(p: ProductoParaCalculo): string {
  return POR_TIPO[p.tipoClave ?? ''] || tipoDeTexto(p.clase) || tipoDeTexto(p.tipo) ||
    ({ etf: 'Renta variable', pension: 'Planes de pensiones' } as Record<string, string>)[p.tipoClave ?? ''] || 'Otros';
}

export interface Reparto {
  por: 'clase' | 'producto';
  pesos: Record<string, number>;
  vigilar: number;
  rebalancear: number;
  conEfectivo?: boolean;
  cuenta?: Record<string, boolean>;
}

/** El reparto guardado, al día: uno antiguo por categoría («RV Global Emergente»: 20) se suma en su
    cubo («Renta variable»). Poner un % en el efectivo ya es pedir que cuenten las cuentas. */
export function normalizaReparto<R extends Reparto | null | undefined>(o: R): R {
  if (!o || o.por === 'producto') return o;
  const pesos: Record<string, number> = {};
  Object.entries(o.pesos || {}).forEach(([k, v]) => {
    const t = tipoDeTexto(k) || 'Otros';
    pesos[t] = Math.round(((pesos[t] || 0) + Number(v || 0)) * 100) / 100;
  });
  return { ...o, por: 'clase', pesos, conEfectivo: !!o.conEfectivo || pesos.Efectivo > 0 } as R;
}

const grupoReparto = (p: ProductoParaCalculo, o: Reparto) => (o.por === 'producto' ? (p.corto || p.nombre || '') : tipoReparto(p));

/** Si un producto cuenta para el reparto según la regla general: lo invertido a largo plazo, sí;
    las cuentas, solo si su grupo tiene un % (o si se pide contarlo todo); las deudas, nunca. */
export function cuentaPorDefecto(p: ProductoParaCalculo, o: Reparto) {
  o = normalizaReparto(o);
  if (p.tipoClave === 'deuda') return false;
  if (o.conEfectivo) return true;
  if (p.tipoClave === 'efectivo') return o.pesos[grupoReparto(p, o)] > 0;
  return p.largoPlazo !== false;
}

/** Lo mismo, pero mandando lo que el usuario ha elegido a mano para ese producto («cuenta»). */
export function cuentaEnReparto(p: ProductoParaCalculo, o: Reparto) {
  if (p.tipoClave === 'deuda') return false;
  const elegido = o && o.cuenta && p.id != null && Object.prototype.hasOwnProperty.call(o.cuenta, p.id) ? o.cuenta[p.id] : null;
  return elegido == null ? cuentaPorDefecto(p, o) : !!elegido;
}

export interface GrupoReparto<C = string | null> {
  nombre: string;
  valor: number;
  color: C;
  productos: string[];
}

/** Lo que tienes, agrupado como tu reparto objetivo (por tipo de activo o por producto),
    con solo los productos que cuentan (ver cuentaEnReparto). */
export function gruposReparto<P extends ProductoParaCalculo, C = string | null>(
  lista: P[], oGuardado: Reparto, valorDe: ValorDe<P> = valorPorDefecto, colorDe: (p: P | null) => C = () => null as C,
): GrupoReparto<C>[] {
  const o = normalizaReparto(oGuardado);
  const acc = new Map<string, GrupoReparto<C>>();
  lista.forEach((p) => {
    const v = valorDe(p);
    if (!(v > 0) || !cuentaEnReparto(p, o)) return;
    const k = grupoReparto(p, o);
    const g = acc.get(k) || { nombre: k, valor: 0, color: colorDe(p), productos: [] };
    g.valor += v;
    g.productos.push(p.corto || p.nombre || '');
    acc.set(k, g);
  });
  Object.keys(o.pesos).forEach((k) => {
    if (!acc.has(k)) acc.set(k, { nombre: k, valor: 0, color: colorDe(null), productos: [] });
  });
  return [...acc.values()];
}

export type EstadoReparto = 'ok' | 'vigilar' | 'rebalancear';

/** Cada grupo con su % de ahora, su objetivo, la desviación en puntos, el semáforo y lo
    que habría que comprar (+) o vender (−) para cuadrarlo hoy. Ordenado por objetivo. */
export function filasReparto<G extends { nombre: string; valor: number }>(grupos: G[], o: Reparto) {
  const total = grupos.reduce((a, g) => a + g.valor, 0);
  const filas = grupos.map((g) => {
    const ahora = total ? (g.valor / total) * 100 : 0;
    const obj = o.pesos[g.nombre] || 0;
    const desv = ahora - obj;
    const estado: EstadoReparto = Math.abs(desv) <= o.vigilar ? 'ok' : Math.abs(desv) <= o.rebalancear ? 'vigilar' : 'rebalancear';
    return { ...g, ahora, obj, desv, estado, cuadrar: (obj / 100) * total - g.valor };
  }).sort((a, b) => b.obj - a.obj || b.valor - a.valor);
  const peor = filas.length ? filas.reduce((a, f) => (Math.abs(f.desv) > Math.abs(a.desv) ? f : a), filas[0]) : null;
  return { total, filas, peor };
}

/** Reparte una aportación entre lo que va por debajo de su objetivo, sin vender nada.
    Si sobra después de cuadrar, el resto se reparte según el objetivo. */
export function repartirAportacion(grupos: { nombre: string; valor: number }[], pesos: Record<string, number>, aporte: number) {
  if (!(aporte > 0)) return grupos.map(() => 0);
  const total = grupos.reduce((a, g) => a + g.valor, 0) + aporte;
  const falta = grupos.map((g) => Math.max(0, ((pesos[g.nombre] || 0) / 100) * total - g.valor));
  const sumaFalta = falta.reduce((a, b) => a + b, 0);
  if (sumaFalta <= aporte) {
    const sobra = aporte - sumaFalta;
    const sumaPesos = grupos.reduce((a, g) => a + (pesos[g.nombre] || 0), 0) || 1;
    return grupos.map((g, i) => falta[i] + (sobra * (pesos[g.nombre] || 0)) / sumaPesos);
  }
  return falta.map((f) => (aporte * f) / sumaFalta);
}

// ---------------------------------------------------------------- objetivo (pintaPatrimonio en app.js)

/**
 * Hacia dónde mide el progreso el panel: tu objetivo propio si aún no lo has alcanzado; si no, el
 * siguiente hito. null si no queda ninguno.
 */
export function siguienteMeta(
  valor: number,
  objetivo: { activo?: boolean; importe?: number | null; etiqueta?: string } | null | undefined,
  hitos: { importe: number }[],
) {
  const propio = objetivo?.activo ? objetivo.importe ?? null : null;
  const hito = hitos.find((h) => h.importe > valor)?.importe;
  const meta = propio && propio > valor ? propio : hito;
  if (!meta) return null;
  return {
    importe: meta,
    etiqueta: propio && propio > valor && objetivo?.etiqueta ? objetivo.etiqueta : null,
    pct: Math.max(0, Math.min(1, valor / meta)),
    falta: meta - valor,
  };
}

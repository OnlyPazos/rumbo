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

// ---------------------------------------------------------------- «Compartir mi mes» (resumenParaCompartir)

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Lo mínimo del panel que hace falta para la imagen del mes. */
export interface DatosParaCompartir {
  resumenMensual?: { mes: string; inicio: number; fin: number; aportado: number; mercado: number; nuevo?: number; rentabilidad: number | null }[];
  fechas?: string[];
  indiceCartera?: (number | null)[];
  fechaExtracto?: string;
  total?: { tir: number | null };
}

/**
 * Las cifras de un mes (i, posición en resumenMensual; por defecto el último) para la imagen.
 * La rentabilidad sale del índice de la cartera, que no cuenta lo que aportas.
 */
export function resumenParaCompartir(D: DatosParaCompartir, i?: number | null) {
  const rm = (D && D.resumenMensual) || [];
  if (!rm.length) return null;
  if (i == null || !(i >= 0 && i < rm.length)) i = rm.length - 1;
  const r = rm[i];
  const [ano, mes] = r.mes.split('-').map(Number);
  const finDe = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const ultimo = i === rm.length - 1;
  const enCurso = ultimo && String(D.fechaExtracto || '') < finDe(ano, mes);
  const F = D.fechas || [];
  const I = D.indiceCartera || [];
  const indiceHasta = (lim: string) => {
    let v: number | null = null;
    for (let k = 0; k < F.length && F[k] <= lim; k++) if (I[k] != null) v = I[k];
    return v;
  };
  let base = indiceHasta(`${ano - 1}-12-31`);
  let desde = 1;
  if (base == null) {   // empezaste este año: desde tu primer día
    const k = F.findIndex((f, j) => f >= `${ano}-01-01` && I[j] != null);
    base = k >= 0 ? I[k] : null;
    desde = k >= 0 ? +F[k].slice(5, 7) : mes;
  }
  const serie: number[] = base == null ? [] : [base];
  for (let m = desde; m <= mes; m++) {
    const v = indiceHasta(finDe(ano, m));
    if (v != null) serie.push(v);
  }
  const primero = I.find((v) => v != null) ?? null;
  const fin = serie.length ? serie[serie.length - 1] : null;
  let k = i;
  let racha = 0;
  if (enCurso && !(rm[k].aportado > 0)) k--;   // el mes en curso aún puede llegar
  while (k >= 0 && rm[k].aportado > 0) {
    racha++;
    k--;
  }
  const nuevo = r.nuevo || 0;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    mes: r.mes, ano, nombreMes: MESES_LARGOS[mes - 1], etiqueta: `${cap(MESES_LARGOS[mes - 1])} ${ano}`,
    enCurso, ultimo,
    rentMes: r.rentabilidad,
    anoPct: base && fin ? fin / base - 1 : null,
    desdeInicio: primero && fin ? fin / primero - 1 : null,
    serieAno: serie, etqIni: cap(MESES_LARGOS[desde - 1]), etqFin: cap(MESES_LARGOS[mes - 1]),
    racha,
    tir: ultimo && D.total ? D.total.tir : null,
    patrimonio: r.fin, cambioEur: r.fin - r.inicio - nuevo,
    aportadoEur: r.aportado, mercadoEur: r.mercado,
    crecimiento: r.inicio > 0 ? (r.fin - r.inicio - nuevo) / r.inicio : null,
    porAportado: r.inicio > 0 ? r.aportado / r.inicio : null,
    porMercado: r.inicio > 0 ? r.mercado / r.inicio : null,
  };
}

export type ResumenCompartir = NonNullable<ReturnType<typeof resumenParaCompartir>>;

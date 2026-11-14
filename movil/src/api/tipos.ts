/**
 * Tipos de la API de Rumbo (backend Flask de Dani Dominguez Quant: github.com/danidm98/rumbo).
 *
 * Sacados de app/servidor.py, app/almacen.py y del JSON real que calcula app/motor.py.
 * Los nombres de los campos son los del original (en español) para que sea fácil
 * contrastarlos con el código Python. Lo que aún no usa la app va tipado en grueso
 * (Record<string, unknown>) y se irá afinando al hacer cada pantalla.
 */

// ---------------------------------------------------------------- catálogos

export type TipoProducto =
  | 'fondo' | 'etf' | 'accion' | 'cripto' | 'commodity' | 'bono' | 'pension'
  | 'efectivo' | 'inmueble' | 'deuda' | 'p2p' | 'otro';

export type Fuente = 'morningstar' | 'yahoo' | 'coingecko' | 'manual';

export type TipoMovimiento = 'compra' | 'venta' | 'dividendo' | 'comision' | 'traspaso' | 'ajuste';

/** Fecha en formato ISO: AAAA-MM-DD. */
export type FechaISO = string;

/** Par de colores [claro, oscuro] que el motor asigna a cada producto o grupo. */
export type ParColores = [string, string];

// ---------------------------------------------------------------- respuestas genéricas

export interface RespuestaError {
  ok: false;
  errores?: string[];
  error?: string;
  /** 409: el perfil activo cambió desde otro sitio; hay que recargar. */
  perfilCambiado?: boolean;
}

// ---------------------------------------------------------------- cartera (lo que se guarda: cartera.json)

/** Lo común a un producto de la cartera y a uno ya calculado. */
interface ProductoBase {
  id: string;
  nombre: string;
  corto?: string;
  fuente: Fuente;
  codigo?: string;
  moneda?: string;
  identificador?: string;
  entidad?: string;
  clase?: string;
  gestora?: string;
  tipoDetalle?: string;
  respaldo?: string;
  respaldoMoneda?: string;
  vivo?: string;
  papel?: string;
  expoComo?: string;
  largoPlazo?: boolean;
  liquidez?: boolean | null;
  /** Color (1–12). */
  slot?: number;
  /** Comisión anual en tanto por uno (0.0012 = 0,12 %). */
  ter?: number;
  riesgo?: number;
  /** Solo en «Todos juntos»: nombre del perfil al que pertenece. */
  perfil?: string;
  [extra: string]: unknown;
}

/** Un producto tal como se guarda en la cartera (cartera.json). */
export interface Producto extends ProductoBase {
  tipo: TipoProducto;
}

export interface Movimiento {
  id: string;
  fecha: FechaISO;
  producto: string;
  tipo: TipoMovimiento;
  importe?: number | null;
  unidades?: number | null;
  comision?: number | null;
  nota?: string;
  /** Traspasos: producto de destino y unidades recibidas. */
  destino?: string;
  unidadesDestino?: number | null;
  [extra: string]: unknown;
}

export interface Valoracion {
  id: string;
  fecha: FechaISO;
  producto: string;
  valor: number;
  aportado?: number;
}

export interface Objetivo {
  activo: boolean;
  importe: number | null;
  etiqueta: string;
  elegido?: boolean;
}

export type Colchon =
  | { modo: 'meses'; meses: number; gastoMensual: number }
  | { modo: 'importe'; importe: number };

export interface RepartoObjetivo {
  por: 'clase' | 'producto';
  pesos: Record<string, number>;
  vigilar: number;
  rebalancear: number;
  conEfectivo: boolean;
  cuenta?: Record<string, boolean>;
}

export interface Cartera {
  version: number;
  titular: string;
  productos: Producto[];
  movimientos: Movimiento[];
  valoraciones: Valoracion[];
  comparador: { id: string; nombre: string; real?: boolean; [extra: string]: unknown }[];
  hitos: number[];
  objetivo: Objetivo;
  colchon?: Colchon;
  objetivoReparto?: RepartoObjetivo;
  [extra: string]: unknown;
}

export type Modo = 'propio' | 'demo' | 'todos';

/** GET /api/cartera */
export interface RespuestaCartera {
  modo: Modo;
  cartera: Cartera;
  tipos: Record<TipoProducto, string>;
  fuentes: Record<Fuente, string>;
  tiposMovimiento: Record<TipoMovimiento, string>;
}

/** POST /api/productos|movimientos|valoraciones|objetivo|colchon|reparto, DELETE /api/<coleccion>/<id>… */
export interface RespuestaCambio<T = unknown> {
  ok: true;
  item: T;
  cartera: Cartera;
  avisos: string[];
}

// ---------------------------------------------------------------- panel (lo calculado: GET /api/panel)

export interface Ventanas {
  '1m'?: number | null;
  '3m'?: number | null;
  '6m'?: number | null;
  '1a'?: number | null;
  ytd?: number | null;
}

export interface AportacionCalculada {
  fecha: FechaISO;
  importe: number;
  participaciones: number;
  precio: number;
  comision: number;
  tipoOrden?: string;
  valor: number;
  nivel: number;
}

/**
 * Un producto ya calculado por el motor. Ojo: aquí `tipo` es el nombre para enseñar
 * («Fondo indexado») y la clave («fondo») va en `tipoClave`; en la cartera es al revés.
 */
export interface ProductoCalculado extends ProductoBase {
  tipo: string;
  tipoClave: TipoProducto;
  fuentePrecio: string;
  fuenteTexto: string;
  etqPrecio: string;
  etqUnidades: string;
  etqVentanas: string;
  slotColor: ParColores;
  /** Valor diario, alineado con PanelDatos.fechas (null antes de tenerlo). */
  serie: (number | null)[];
  serieAportado: (number | null)[];
  valor: number;
  aportado: number | null;
  plusvalia: number | null;
  /** Tantos por uno (0.18 = 18 %). */
  rentabilidad: number | null;
  tir: number | null;
  peso: number;
  desde: FechaISO;
  aportaciones: AportacionCalculada[];
  // Solo productos con precio (fondos, ETF, acciones…):
  participaciones?: number;
  nav?: number;
  navFecha?: FechaISO;
  navSerie?: (number | null)[];
  precioMedio?: number;
  ventanas?: Ventanas;
  realizado?: number;
  gananciaTotal?: number;
  rentabilidadTotal?: number;
  cobros?: { ventas: number; dividendos: number; gastos: number };
  flujos?: [FechaISO, number][];
  // Solo los que se siguen con saldos anotados:
  snapshots?: [FechaISO, number][];
}

export interface GrupoReparto {
  nombre: string;
  valor: number;
  peso: number;
  color: ParColores;
}

export interface Totales {
  patrimonio: number;
  aportado: number;
  valorConCoste: number;
  plusvalia: number;
  rentabilidad: number | null;
  tir: number | null;
  realizado: number;
  serie: number[];
  serieAportado: number[];
  porClase: GrupoReparto[];
  porEntidad: GrupoReparto[];
  porTipo: GrupoReparto[];
  hitos: { importe: number; fecha: FechaISO | null }[];
  racha: number;
  ritmoMensual: number;
  numAportaciones: number;
  diasInvertido: number;
  caidaMaxima: number;
  caidaMaximaFecha: FechaISO;
}

export interface ResumenMes {
  mes: string;
  inicio: number;
  fin: number;
  aportado: number;
  nuevo: number;
  mercado: number;
  rentabilidad: number | null;
  porProducto: Record<string, unknown>;
}

export interface PanelDatos {
  generado: string;
  titular: string;
  moneda: string;
  fechaExtracto: FechaISO;
  /** Eje de fechas de todas las series diarias. */
  fechas: FechaISO[];
  productos: ProductoCalculado[];
  otrosActivos: ProductoCalculado[];
  pasivos: ProductoCalculado[];
  total: Totales;
  aportacionesMensuales: { meses: string[]; porProducto: Record<string, number[]>; total: number[] };
  objetivo: Record<string, unknown> | null;
  objetivoReparto: RepartoObjetivo | null;
  colchon: Record<string, unknown> | null;
  comisiones: Record<string, unknown>;
  rentabilidadAnual: Record<string, unknown>;
  dividendos: Record<string, unknown>;
  monedas: Record<string, unknown>;
  resumenMensual: ResumenMes[];
  comparador: Record<string, unknown>[];
  comparacion: Record<string, unknown> | null;
  indiceCartera: number[];
  vivo: Record<string, unknown> | null;
  avisos: string[];
  /** Los añade el servidor tras calcular. */
  modo: Modo;
  preciosActualizados: string | null;
}

export interface PerfilInfo {
  id: string;
  nombre: string;
  conDatos: boolean;
}

export interface InfoPerfiles {
  /** Id del perfil activo, o "todos". */
  activo: string;
  /** Si se puede elegir «Todos juntos» (hay al menos dos perfiles con datos). */
  todos: boolean;
  lista: PerfilInfo[];
}

/** GET /api/panel. `datos` es null mientras la cartera está vacía. */
export interface RespuestaPanel {
  datos: PanelDatos | null;
  perfiles: InfoPerfiles;
}

// ---------------------------------------------------------------- otras respuestas

/** GET /api/buscar (app/buscar.py → añade()). */
export interface ResultadoBusqueda {
  fuente: Fuente;
  codigo: string;
  nombre: string | null;
  tipo: TipoProducto;
  identificador: string;
  vivo: string | null;
  bolsa: string | null;
}

export interface CopiaSeguridad {
  archivo: string;
  fecha: string;
  motivo: string;
  productos: number;
  movimientos: number;
}

export interface Version {
  actual: string;
  ultima: string | null;
  repo: string;
  docker: boolean;
  hayNueva: boolean;
}

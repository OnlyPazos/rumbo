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
  /** Aportaciones periódicas que Rumbo recuerda para avisar de las siguientes. */
  periodicas?: { producto: string; importe: number; dia: number; ultima: FechaISO }[];
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
  porProducto: Record<string, { inicio: number; fin: number; aportado: number; mercado: number; nuevo?: number }>;
}

/** Tu rentabilidad cada año (de la cartera y de cada producto), limpia de cuándo metiste el dinero. */
export interface RentabilidadAnual {
  anos: string[];
  cartera: (number | null)[];
  /** Año incompleto (el primero o el actual). */
  parcial: boolean[];
  porProducto: Record<string, (number | null)[]>;
  /** Desde qué día cuenta cada año (el de la primera compra), si no es el 1 de enero. */
  desde: Record<string, (FechaISO | null)[]>;
  vendido: Record<string, boolean[]>;
}

export interface MetricasCartera {
  rentTotal: number;
  /** Anualizada. */
  cagr: number;
  vol: number;
  sharpe: number | null;
  maxDD: number;
  maxDDFecha: FechaISO;
  desde: FechaISO;
  hasta: FechaISO;
}

/** Tu cartera real frente a carteras alternativas con pesos fijos, en base 100. */
export interface CarteraComparada {
  id: string;
  nombre: string;
  real?: boolean;
  pesos: Record<string, number> | null;
  indice: (number | null)[];
  metricas: MetricasCartera;
}

/** «¿Y si lo hubieras metido todo en un indexado?»: tus mismas aportaciones en un ETF de referencia. */
export interface Comparacion {
  desde: FechaISO;
  tuya: (number | null)[];
  aportado: (number | null)[];
  tuValor: number;
  tuTir: number | null;
  referencias: {
    id: string;
    nombre: string;
    detalle: string;
    serie: (number | null)[];
    valor: number;
    tir: number | null;
    aviso: string | null;
  }[];
}

export interface Dividendos {
  total: number;
  ultimos12: number;
  /** Los últimos 12 meses sobre lo que vale hoy. */
  rentabilidad: number | null;
  porAno: [string, number][];
  porProducto: { id: string; total: number; ultimos12: number; sobreValor: number | null; sobreCoste: number | null; ultimo: FechaISO; cobros: number }[];
  ultimos: unknown[];
}

export interface Comisiones {
  lineas: { id: string; nombre: string; ter: number; valor: number; anual: number; color: ParColores }[];
  anual: number;
  base: number;
  terPonderado: number;
  compraventaPagada: number;
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
  comisiones: Comisiones;
  rentabilidadAnual: RentabilidadAnual;
  dividendos: Dividendos;
  monedas: Record<string, unknown>;
  resumenMensual: ResumenMes[];
  comparador: CarteraComparada[];
  comparacion: Comparacion | null;
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

/** GET /api/buscar (app/buscar.py): solo salen los que tienen precio (se comprueba antes). */
export interface ResultadoBusqueda {
  fuente: Fuente;
  codigo: string;
  nombre: string | null;
  tipo: TipoProducto;
  identificador: string;
  /** Id de CoinGecko para el precio en vivo de una cripto. */
  vivo: string | null;
  mercado?: string | null;
  precio?: number;
  fecha?: FechaISO;
  moneda?: string;
  /** Lo que da Morningstar de un fondo: TER en % (0,12), riesgo 1–7, categoría y gestora. */
  ficha?: { ter?: number; riesgo?: number; clase?: string; gestora?: string };
}

/** Una venta para la Renta: ganancia o pérdida por FIFO, como Hacienda (app/fiscal.py). */
export interface VentaFiscal {
  producto: string;
  nombre: string;
  isin: string | null;
  tipo: string;
  fecha: FechaISO;
  unidades: number | null;
  transmision: number;
  adquisicion: number | null;
  ganancia: number;
  compras: { fecha: FechaISO; unidades: number; coste: number }[];
  avisos: string[];
}

/** GET /api/fiscal?ano=AAAA: orientativo, para repasar el borrador de la Renta. */
export interface InformeFiscal {
  ok: true;
  csv: string;
  ano: string;
  anos: string[];
  ventas: VentaFiscal[];
  rescates: VentaFiscal[];
  cobros: { producto: string; nombre: string; clase: string; cobros: number; importe: number }[];
  comisiones: { producto: string; nombre: string; importe: number }[];
  gastosAlquiler: { producto: string; nombre: string; importe: number }[];
  totales: {
    ganancias: number; perdidas: number; saldo: number; transmision: number; adquisicion: number;
    dividendos: number; intereses: number; alquileres: number; gastosAlquiler: number; comisiones: number; rescates: number;
  };
  avisos: string[];
}

/** Un traspaso de MyInvestor por contestar: ¿de qué fondo venía y cuándo? (app/importar.py) */
export interface TraspasoMyInvestor {
  ref: string;
  isin: string;
  nombre: string;
  lotes: number;
  coste: number;
  unidades: number;
  /** [fecha, importe, unidades] de cada lote que llegó por traspaso. */
  detalle: [FechaISO, number, number][];
  sugerencia: { origen: string; fecha: string } | null;
  respuesta: RespuestaTraspaso | null;
  origenes: { id: string; nombre: string }[];
  hecho: boolean;
  error: string | null;
  aviso: string | null;
}

/** Respuesta a un traspaso: el fondo de origen y una fecha (AAAA-MM-DD) o «estimar». */
export interface RespuestaTraspaso {
  origen: string;
  fecha: string;
}

/** La vista previa de una importación (y el informe al confirmarla). */
export interface InformeImportacion {
  añadidos: number;
  repetidos: number;
  saldos: number;
  sustituidos: number;
  errores: { fila: string | number; mensaje: string }[];
  avisos: string[];
  totales: { compras: number; ventas: number; dividendos: number; comisiones: number; numCompras: number };
  productosNuevos: (Partial<Producto> & { precio?: number | null; monedaPrecio?: string; fechaPrecio?: FechaISO; mercado?: string })[];
  filas: { fila: string | number; fecha: FechaISO; producto: string; productoNombre: string; tipo: string; unidades: number | null; importe: number; marcas: string[]; estado: string }[];
  traspasosMyInvestor: TraspasoMyInvestor[];
}

/** Lo que manda el formulario de una aportación periódica (los números pueden ir como texto). */
export interface PeticionPeriodica {
  producto: string;
  importe: number | string;
  dia: number | string;
  desde: FechaISO;
  hasta?: FechaISO;
}

/** POST /api/periodicas/ver: las compras que se añadirían, con el precio de cada día (app/periodicas.py). */
export interface PlanPeriodica {
  producto: string;
  nombre: string;
  aMano: boolean;
  importe: number;
  dia: number;
  desde: FechaISO;
  hasta: FechaISO;
  lineas: {
    fecha: FechaISO;
    importe: number;
    precio: number | null;
    fechaPrecio: FechaISO | null;
    unidades: number | null;
    /** nueva: se añade · repetida: ya la tienes anotada · sinPrecio: no hay cierre esa semana. */
    estado: 'nueva' | 'repetida' | 'sinPrecio';
  }[];
  nuevas: number;
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

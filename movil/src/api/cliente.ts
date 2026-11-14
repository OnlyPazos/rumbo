/**
 * Cliente de la API de Rumbo (backend Flask de github.com/danidm98/rumbo, por Dani Dominguez Quant).
 *
 * - La llave de acceso viaja en «Authorization: Bearer <llave>» (cambio del fork en app/servidor.py;
 *   el panel web original sigue usando su cookie).
 * - En lo que cambia datos se manda «X-Rumbo-Perfil» con el perfil que se está viendo: si en otro
 *   sitio se cambió de perfil, el servidor responde 409 en vez de guardar en el perfil equivocado.
 * - Todos los errores se convierten en ErrorRumbo, con los mensajes del servidor tal cual
 *   (ya vienen escritos para enseñárselos a la persona).
 */
import type {
  Cartera, Colchon, CopiaSeguridad, FechaISO, InfoPerfiles, Movimiento, Objetivo, Producto,
  RepartoObjetivo, RespuestaCambio, RespuestaCartera, RespuestaPanel, ResultadoBusqueda,
  Valoracion, Version,
} from './tipos';

export class ErrorRumbo extends Error {
  constructor(
    public readonly errores: string[],
    public readonly estado: number,
    /** 409: el perfil activo cambió desde otro sitio; hay que recargar el panel. */
    public readonly perfilCambiado = false,
  ) {
    super(errores.join(' '));
    this.name = 'ErrorRumbo';
  }
}

export interface Conexion {
  /** Dirección del servidor, p. ej. http://100.101.102.103:8765 (Tailscale) o http://192.168.1.50:8765. */
  servidor: string;
  /** La llave de mis_datos/.acceso (o la que sale en la dirección ?acceso=…). */
  llave: string;
}

type Metodo = 'GET' | 'POST' | 'DELETE';
type Consulta = Record<string, string | number | undefined>;

/**
 * Los números de los formularios pueden ir como texto tal cual lo escribe la persona («1.234,56»):
 * el backend los entiende (numero() en app/almacen.py) y responde con mensajes claros si no.
 */
type NumeroOTexto = number | string | null | undefined;

export interface FormularioMovimiento {
  id?: string;
  tipo: Movimiento['tipo'];
  producto: string;
  fecha: string;
  importe?: NumeroOTexto;
  unidades?: NumeroOTexto;
  comision?: NumeroOTexto;
  nota?: string;
  /** Moneda del importe si no es EUR: el backend lo pasa a euros con el cambio del día. */
  moneda?: string;
  destino?: string;
  unidadesDestino?: NumeroOTexto;
}

export interface FormularioValoracion {
  id?: string;
  producto: string;
  fecha: string;
  valor: NumeroOTexto;
  aportado?: NumeroOTexto;
}

/** Archivo para subir (importar o recuperar una copia). En web vale un File/Blob. */
export type ArchivoSubida = { uri: string; name: string; type?: string } | Blob;

/**
 * Acepta lo que la persona pegue: «192.168.1.50:8765», «http://nas:8765/» o la dirección entera
 * con la llave que imprime el servidor («http://IP:8765/?acceso=…»), y la separa.
 */
export function leeDireccion(texto: string): { servidor: string; llave?: string } {
  let t = texto.trim();
  if (!/^https?:\/\//i.test(t)) t = 'http://' + t;
  const url = new URL(t);
  const llave = url.searchParams.get('acceso') ?? undefined;
  return { servidor: `${url.protocol}//${url.host}`, llave: llave || undefined };
}

export class ClienteRumbo {
  /** Perfil que se está viendo (lo pone cargarPanel); se manda al cambiar datos. */
  perfil: string | null = null;

  constructor(private readonly conexion: Conexion, private readonly espera = 60_000) {}

  get servidor() {
    return this.conexion.servidor;
  }

  // ------------------------------------------------------------ base

  private url(ruta: string, consulta?: Consulta) {
    const u = new URL(ruta, this.conexion.servidor);
    for (const [k, v] of Object.entries(consulta ?? {})) if (v !== undefined) u.searchParams.set(k, String(v));
    return u.toString();
  }

  private cabeceras(metodo: Metodo, extra?: Record<string, string>) {
    const h: Record<string, string> = { Authorization: `Bearer ${this.conexion.llave}`, Accept: 'application/json', ...extra };
    if (metodo !== 'GET' && this.perfil) h['X-Rumbo-Perfil'] = this.perfil;
    return h;
  }

  /** Petición sin interpretar (para descargas: Excel, copias…). */
  async crudo(metodo: Metodo, ruta: string, opciones: { consulta?: Consulta; cuerpo?: BodyInit; cabeceras?: Record<string, string> } = {}) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), this.espera);
    try {
      return await fetch(this.url(ruta, opciones.consulta), {
        method: metodo, headers: this.cabeceras(metodo, opciones.cabeceras), body: opciones.cuerpo, signal: control.signal,
      });
    } catch {
      const motivo = control.signal.aborted ? 'tarda demasiado en responder' : 'no responde';
      throw new ErrorRumbo([`Rumbo ${motivo} en ${this.conexion.servidor}. ¿Está encendido y estás en la misma red (o en Tailscale)?`], 0);
    } finally {
      clearTimeout(reloj);
    }
  }

  private async json<T>(metodo: Metodo, ruta: string, opciones: { consulta?: Consulta; json?: unknown; form?: FormData } = {}): Promise<T> {
    const cuerpo = opciones.form ?? (opciones.json !== undefined ? JSON.stringify(opciones.json) : undefined);
    const cabeceras = opciones.json !== undefined ? { 'Content-Type': 'application/json' } : undefined;
    const r = await this.crudo(metodo, ruta, { consulta: opciones.consulta, cuerpo, cabeceras });
    let datos: any = null;
    try {
      datos = await r.json();
    } catch {
      // Sin JSON: un 403 por dirección no permitida devuelve texto plano.
    }
    if (!r.ok || datos?.ok === false) {
      const errores: string[] = datos?.errores ?? (datos?.error ? [datos.error] : []);
      if (!errores.length) {
        errores.push(r.status === 403
          ? 'Rumbo no acepta la conexión: revisa la llave de acceso y que la dirección esté permitida (PATRIMONIO_HOSTS_PERMITIDOS).'
          : `Rumbo ha respondido con un error (${r.status}).`);
      }
      throw new ErrorRumbo(errores, r.status, Boolean(datos?.perfilCambiado));
    }
    return datos as T;
  }

  private get<T>(ruta: string, consulta?: Consulta) {
    return this.json<T>('GET', ruta, { consulta });
  }

  private post<T>(ruta: string, json: unknown = {}) {
    return this.json<T>('POST', ruta, { json });
  }

  // ------------------------------------------------------------ conexión

  /** ¿Hay un Rumbo en esa dirección? (no necesita llave) */
  async esRumbo() {
    try {
      const r = await fetch(this.url('/api/ping'));
      return (await r.json())?.app === 'patrimonio';
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------ panel y cartera

  async cargarPanel() {
    const r = await this.get<RespuestaPanel>('/api/panel');
    this.perfil = r.perfiles.activo;
    return r;
  }

  cartera() {
    return this.get<RespuestaCartera>('/api/cartera');
  }

  /** Descarga los precios nuevos y recalcula (tarda unos segundos). */
  actualizarPrecios() {
    return this.post<{ ok: true; avisos: string[] }>('/api/actualizar');
  }

  /** Sale de la demo: cartera vacía o copia del ejemplo para practicar. */
  empezar(desde: 'vacia' | 'ejemplo' = 'vacia') {
    return this.post<{ ok: true }>('/api/empezar', { desde });
  }

  /** Empieza de cero o vuelve a la demo (lo anterior queda en las copias). */
  reiniciar(a: 'vacia' | 'demo') {
    return this.post<{ ok: true }>('/api/reiniciar', { a });
  }

  // ------------------------------------------------------------ productos, movimientos y valores

  guardarProducto(producto: Partial<Producto>) {
    return this.post<RespuestaCambio<Producto>>('/api/productos', producto);
  }

  guardarMovimiento(movimiento: FormularioMovimiento) {
    return this.post<RespuestaCambio<Movimiento>>('/api/movimientos', movimiento);
  }

  guardarValoracion(valoracion: FormularioValoracion) {
    return this.post<RespuestaCambio<Valoracion>>('/api/valoraciones', valoracion);
  }

  borrar(coleccion: 'productos' | 'movimientos' | 'valoraciones', id: string) {
    return this.json<RespuestaCambio<unknown>>('DELETE', `/api/${coleccion}/${encodeURIComponent(id)}`);
  }

  guardarObjetivo(objetivo: Partial<Objetivo>) {
    return this.post<RespuestaCambio<Objetivo>>('/api/objetivo', objetivo);
  }

  guardarColchon(colchon: Colchon | { borrar: true }) {
    return this.post<RespuestaCambio<Colchon | null>>('/api/colchon', colchon);
  }

  guardarReparto(reparto: Partial<RepartoObjetivo> & { borrar?: boolean }) {
    return this.post<RespuestaCambio<RepartoObjetivo | null>>('/api/reparto', reparto);
  }

  repartirColores() {
    return this.post<RespuestaCambio<unknown>>('/api/repartir-colores');
  }

  // ------------------------------------------------------------ ayudas para los formularios

  buscar(q: string) {
    return this.get<{ resultados: ResultadoBusqueda[]; sinConexion: boolean }>('/api/buscar', { q });
  }

  /** Euros por cada unidad de esa moneda ese día. */
  cambio(moneda: string, fecha?: FechaISO) {
    return this.get<{ ok: boolean; cambio: number | null }>('/api/cambio', { moneda, fecha });
  }

  /** Unidades exactas que tenías un día (para «Vender todo»). */
  unidades(producto: string, fecha?: FechaISO, excluir?: string) {
    return this.get<{ ok: true; unidades: number }>('/api/unidades', { producto, fecha, excluir });
  }

  /** Precio en euros de un producto un día (para rellenar un traspaso). */
  precio(producto: string, fecha?: FechaISO) {
    return this.get<{ ok: boolean; precio: number | null; fecha: FechaISO | null }>('/api/precio', { producto, fecha });
  }

  // ------------------------------------------------------------ aportaciones periódicas

  verPeriodicas(datos: Record<string, unknown>) {
    return this.post<{ ok: true; plan: Record<string, unknown> }>('/api/periodicas/ver', datos);
  }

  crearPeriodicas(datos: Record<string, unknown>) {
    return this.post<RespuestaCambio<unknown>>('/api/periodicas/crear', datos);
  }

  olvidarPeriodicas(datos: Record<string, unknown>) {
    return this.post<RespuestaCambio<unknown>>('/api/periodicas/olvidar', datos);
  }

  // ------------------------------------------------------------ Renta

  fiscal(ano?: number) {
    return this.get<{ ok: true; csv: string; [k: string]: unknown }>('/api/fiscal', { ano });
  }

  // ------------------------------------------------------------ importar

  previsualizarImportacion(origen: 'myinvestor' | 'tabla', opciones: { archivos?: ArchivoSubida[]; texto?: string }) {
    const form = new FormData();
    form.append('origen', origen);
    if (opciones.texto) form.append('texto', opciones.texto);
    for (const a of opciones.archivos ?? []) form.append('archivos', a as any);
    return this.json<{ ok: true; token: string; informe: Record<string, unknown> }>('POST', '/api/importar/previsualizar', { form });
  }

  revisarImportacion(token: string, respuestas: Record<string, unknown>) {
    return this.post<{ ok: true; token: string; informe: Record<string, unknown> }>('/api/importar/revisar', { token, respuestas });
  }

  confirmarImportacion(token: string, respuestas: Record<string, unknown> = {}) {
    return this.post<RespuestaCambio<null> & { informe: Record<string, number> }>('/api/importar/confirmar', { token, respuestas });
  }

  promptIA() {
    return this.get<{ texto: string }>('/api/prompt');
  }

  // ------------------------------------------------------------ copias de seguridad

  copias() {
    return this.get<{ copias: CopiaSeguridad[] }>('/api/copias');
  }

  recuperarCopia(archivo: string) {
    return this.post<{ ok: true }>('/api/copia/recuperar', { archivo });
  }

  subirCopia(archivo: ArchivoSubida) {
    const form = new FormData();
    form.append('archivo', archivo as any);
    return this.json<{ ok: true }>('POST', '/api/copia/subir', { form });
  }

  /**
   * Descargas (devuelven la respuesta tal cual, para guardarla o compartirla):
   * /api/copia/descargar, /api/exportar-excel, /api/plantilla.xlsx, /api/plantilla.csv,
   * /api/exportar-web?ocultar=1
   */
  descargar(ruta: string, consulta?: Consulta) {
    return this.crudo('GET', ruta, { consulta });
  }

  // ------------------------------------------------------------ perfiles

  perfiles() {
    return this.get<{ ok: true } & InfoPerfiles>('/api/perfiles');
  }

  crearPerfil(nombre: string) {
    return this.post<{ ok: true; id: string }>('/api/perfiles', { nombre });
  }

  activarPerfil(id: string) {
    return this.post<{ ok: true }>('/api/perfiles/activar', { id });
  }

  renombrarPerfil(id: string, nombre: string) {
    return this.post<{ ok: true }>('/api/perfiles/renombrar', { id, nombre });
  }

  borrarPerfil(id: string) {
    return this.post<{ ok: true }>('/api/perfiles/borrar', { id });
  }

  // ------------------------------------------------------------ versión y soporte

  version() {
    return this.get<Version>('/api/version');
  }

  novedades() {
    return this.get<Record<string, unknown>>('/api/novedades');
  }

  diagnostico() {
    return this.get<{ ok: true; texto: string }>('/api/diagnostico');
  }
}

export type { Cartera };

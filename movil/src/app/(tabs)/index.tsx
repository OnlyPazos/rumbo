/**
 * Panel: la pestaña «Patrimonio» del panel original de Rumbo (app/web/app.js), en el móvil.
 * Cifras clave, evolución, reparto, aportaciones de cada mes y la lista de productos.
 * El periodo elegido (1M … Todo) vale para la evolución, las aportaciones y las mini gráficas.
 */
import { Link, router, Tabs } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
// ScrollView y RefreshControl de gesture-handler: coordinan en nativo el scroll con los gráficos que se arrastran.
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';

import { ErrorRumbo } from '@/api/cliente';
import type { PanelDatos, ProductoCalculado } from '@/api/tipos';
import { AvisosPeriodicas } from '@/componentes/AvisosPeriodicas';
import { PieCreditos } from '@/componentes/Creditos';
import { confirmar } from '@/componentes/Formulario';
import { Segmentos } from '@/componentes/Segmentos';
import { fmtEuros, fmtFecha, fmtPct } from '@/formato';
import { BarrasMensuales } from '@/graficos/BarrasMensuales';
import { Donut, type DatoDonut } from '@/graficos/Donut';
import { AreaApilada } from '@/graficos/AreaApilada';
import { RANGOS, aPorcentajes, desdeIdx, tuDineroYMercado, type Rango } from '@/graficos/escala';
import { Evolucion } from '@/graficos/Evolucion';
import { Mini } from '@/graficos/Mini';
import { useSesion } from '@/sesion/contexto';
import { usePanelAlEnfocar } from '@/sesion/panel';
import { RADIO, colorDe, colorSigno, useColores, type Colores } from '@/tema';

type Vista = 'apilado' | 'total' | 'dinero' | 'reparto';
const VISTAS: { id: Vista; et: string }[] = [
  { id: 'apilado', et: 'Productos' }, { id: 'total', et: 'Total' },
  { id: 'dinero', et: 'Tu dinero' }, { id: 'reparto', et: 'Reparto %' },
];

type Reparto = 'clase' | 'producto' | 'entidad' | 'tipo';
const REPARTOS: { id: Reparto; et: string }[] = [
  { id: 'clase', et: 'Activo' }, { id: 'producto', et: 'Producto' },
  { id: 'entidad', et: 'Entidad' }, { id: 'tipo', et: 'Tipo' },
];

export default function Panel() {
  const c = useColores();
  const { cliente } = useSesion();
  // Los datos los comparten las pestañas; se recargan al volver aquí (por ejemplo, después de anotar algo).
  const { panel, error: errorCarga, cargar } = usePanelAlEnfocar();
  const [errorAccion, setError] = useState<string | null>(null);
  const error = errorAccion ?? errorCarga;
  const [recargando, setRecargando] = useState(false);
  const [rango, setRango] = useState<Rango>('todo');
  const [reparto, setReparto] = useState<Reparto>('clase');
  const [vista, setVista] = useState<Vista>('apilado');   // la de la web por defecto

  /** Sale de la cartera de ejemplo: crea la tuya, vacía o como copia del ejemplo para practicar. */
  async function empezar(desde: 'vacia' | 'ejemplo') {
    if (!cliente) return;
    const ok = await confirmar(
      'Empezar con mis datos',
      desde === 'vacia' ? 'Se crea tu cartera, vacía, para que anotes lo tuyo.' : 'Se crea tu cartera como copia del ejemplo, para practicar.',
      'Empezar',
    );
    if (!ok) return;
    try {
      await cliente.empezar(desde);
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorRumbo ? e.message : String(e));
    }
  }

  async function actualizarPrecios() {
    if (!cliente) return;
    setRecargando(true);
    try {
      await cliente.actualizarPrecios();
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorRumbo ? e.message : String(e));
    } finally {
      setRecargando(false);
    }
  }

  const datos = panel?.datos;
  const productos = datos ? [...datos.productos, ...datos.otrosActivos].sort((a, b) => b.valor - a.valor) : [];
  const i0 = datos ? desdeIdx(datos.fechas, datos.fechaExtracto, rango) : 0;
  const corta = <T,>(arr: T[] | undefined) => (arr ?? []).slice(i0);

  return (
    <>
      <Tabs.Screen
        options={{
          title: datos?.titular ?? 'Rumbo',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
              <Link href="/conectar" style={{ color: c.tinta2, fontSize: 15 }}>Conexión</Link>
              {panel?.datos?.modo === 'propio' || (panel && !panel.datos) ? (
                <Link href="/anotar" style={{ color: c.acento, fontSize: 15, fontWeight: '700' }}>+ Anotar</Link>
              ) : null}
            </View>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={estilos.pagina}
        refreshControl={<RefreshControl refreshing={recargando} onRefresh={actualizarPrecios} />}
      >
        {error && (
          <Tarjeta c={c}>
            <Text style={{ color: c.mal }}>{error}</Text>
            <Pressable onPress={() => { setError(null); cargar(); }}><Text style={{ color: c.acento, marginTop: 8 }}>Reintentar</Text></Pressable>
          </Tarjeta>
        )}

        {!panel && !error && <ActivityIndicator style={{ marginTop: 40 }} />}

        {panel && !datos && (
          <Tarjeta c={c}>
            <Link href="/editar-producto" style={{ color: c.acento, fontWeight: '700', marginBottom: 6 }}>+ Añadir un producto</Link>
            <Text style={{ color: c.tinta2 }}>
              Tu cartera está vacía. Empieza añadiendo tus productos y luego anota sus compras y saldos con «+ Anotar».
            </Text>
          </Tarjeta>
        )}

        {datos && (
          <>
            <AvisosPeriodicas />
            {datos.modo === 'demo' && (
              <Tarjeta c={c}>
                <Text style={[estilos.aviso, { color: c.aviso }]}>Estás viendo la cartera de ejemplo.</Text>
                <Text style={[estilos.pequeno, { color: c.tinta2 }]}>Para anotar lo tuyo, empieza tu propia cartera:</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                  <Pressable onPress={() => empezar('vacia')}>
                    <Text style={{ color: c.acento, fontWeight: '700' }}>Empezar con mis datos</Text>
                  </Pressable>
                  <Pressable onPress={() => empezar('ejemplo')}>
                    <Text style={{ color: c.tinta2 }}>Copiar el ejemplo</Text>
                  </Pressable>
                </View>
              </Tarjeta>
            )}

            <Tarjeta c={c}>
              <Text style={[estilos.etiqueta, { color: c.tinta3 }]}>Patrimonio neto</Text>
              <Text style={[estilos.cifra, { color: c.tinta }]}>{fmtEuros(datos.total.patrimonio)}</Text>
              <View style={estilos.fila}>
                <Dato c={c} titulo="Ganancia" valor={fmtEuros(datos.total.plusvalia)} color={colorSigno(datos.total.plusvalia, c)} />
                <Dato c={c} titulo="Rentabilidad" valor={fmtPct(datos.total.rentabilidad)} color={colorSigno(datos.total.rentabilidad, c)} />
                <Dato c={c} titulo="TIR anual" valor={fmtPct(datos.total.tir)} color={colorSigno(datos.total.tir, c)} />
              </View>
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
                Aportado {fmtEuros(datos.total.aportado)} · datos a {fmtFecha(datos.fechaExtracto)}
              </Text>
            </Tarjeta>

            <Segmentos opciones={RANGOS} activo={rango} alCambiar={setRango} />

            <Tarjeta c={c}>
              <Text style={[estilos.titulo, { color: c.tinta }]}>Evolución</Text>
              <Segmentos opciones={VISTAS} activo={vista} alCambiar={setVista} />
              <View style={{ height: 8 }} />
              <GraficoEvolucion vista={vista} datos={datos} productos={productos} corta={corta} c={c} />
            </Tarjeta>

            <Tarjeta c={c}>
              <Text style={[estilos.titulo, { color: c.tinta }]}>Reparto</Text>
              <Segmentos opciones={REPARTOS} activo={reparto} alCambiar={setReparto} />
              <View style={{ height: 10 }} />
              <Donut key={reparto} c={c} datos={datosReparto(datos, productos, reparto, c)} />
            </Tarjeta>

            <Tarjeta c={c}>
              <Text style={[estilos.titulo, { color: c.tinta }]}>Aportaciones de cada mes</Text>
              <Aportaciones datos={datos} productos={productos} desde={datos.fechas[i0]} c={c} />
            </Tarjeta>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={[estilos.seccion, { color: c.tinta }]}>Productos</Text>
              {datos.modo === 'propio' && (
                <Link href="/editar-producto" style={{ color: c.acento, fontWeight: '700' }}>+ Nuevo</Link>
              )}
            </View>
            {productos.map((p) => <FilaProducto key={p.id} p={p} serie={corta(p.serie)} c={c} />)}

            {datos.avisos.length > 0 && (
              <Tarjeta c={c}>
                <Text style={[estilos.etiqueta, { color: c.aviso }]}>Avisos</Text>
                {datos.avisos.map((a, i) => (
                  <Text key={i} style={[estilos.pequeno, { color: c.tinta2, marginTop: 4 }]}>· {a}</Text>
                ))}
              </Tarjeta>
            )}

            <Text style={[estilos.pequeno, { color: c.tinta3, textAlign: 'center', marginTop: 8 }]}>
              Desliza hacia abajo para descargar los precios nuevos.
            </Text>
          </>
        )}
        <PieCreditos />
      </ScrollView>
    </>
  );
}

/** La gráfica de evolución en cada una de sus vistas (pintaPrincipal en app/web/app.js). */
function GraficoEvolucion({
  vista, datos, productos, corta, c,
}: {
  vista: Vista;
  datos: PanelDatos;
  productos: ProductoCalculado[];
  corta: <T>(arr: T[] | undefined) => T[];
  c: Colores;
}) {
  const fechas = corta(datos.fechas);
  const serie = corta(datos.total.serie);
  const aportado = corta(datos.total.serieAportado);
  const conSerie = productos.filter((p) => p.serie.some((v) => v));
  const nota = (texto: string) => <Text style={[estilos.pequeno, { color: c.tinta3, marginTop: 4 }]}>{texto}</Text>;

  if (vista === 'total') {
    return <Evolucion key="total" c={c} color={c.acento} fechas={fechas} valores={serie} aportado={aportado} />;
  }
  if (vista === 'dinero') {
    const { tuyo, mercado, bajoCoste } = tuDineroYMercado(serie, aportado);
    return (
      <>
        <AreaApilada key="dinero" c={c} fechas={fechas} series={[
          { nombre: 'Lo que pusiste tú', color: c.tinta3, valores: tuyo },
          { nombre: 'Lo que puso el mercado', color: c.bien, valores: mercado },
        ]} />
        {nota(bajoCoste
          ? 'Hubo días por debajo de lo aportado: ahí la banda verde desaparece.'
          : 'La banda verde es rentabilidad, no dinero tuyo.')}
      </>
    );
  }
  if (vista === 'reparto') {
    const pct = aPorcentajes(conSerie.map((p) => corta(p.serie)), fechas.length);
    return (
      <AreaApilada
        key="reparto" c={c} fechas={fechas} maximo={100}
        series={conSerie.map((p, k) => ({ nombre: p.corto || p.nombre, color: colorDe(p.slotColor, c), valores: pct[k] }))}
        formatoEje={(v) => `${Math.round(v)} %`}
        formato={(v) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`}
      />
    );
  }
  // Por producto: el apilado de lo que vale cada uno, con lo aportado encima.
  const tardios = conSerie.filter((p) => p.desde && p.desde > datos.fechas[0] && p.aportado == null);
  return (
    <>
      <AreaApilada
        key="apilado" c={c} fechas={fechas} aportado={aportado}
        series={conSerie.map((p) => ({ nombre: p.corto || p.nombre, color: colorDe(p.slotColor, c), valores: corta(p.serie) }))}
      />
      {tardios.length > 0 && nota(
        `${tardios.map((p) => p.corto || p.nombre).join(', ')} ${tardios.length > 1 ? 'entran' : 'entra'} en el seguimiento el ${fmtFecha(tardios[0].desde)}.`,
      )}
    </>
  );
}

/** Los grupos del donut: los que ya calcula el motor (por clase, entidad y tipo) o producto a producto. */
function datosReparto(datos: PanelDatos, productos: ProductoCalculado[], reparto: Reparto, c: Colores): DatoDonut[] {
  if (reparto === 'producto') {
    return productos.filter((p) => p.valor > 0).map((p) => ({ nombre: p.corto || p.nombre, valor: p.valor, color: colorDe(p.slotColor, c) }));
  }
  const grupos = reparto === 'clase' ? datos.total.porClase : reparto === 'entidad' ? datos.total.porEntidad : datos.total.porTipo;
  return grupos.map((g) => ({ nombre: g.nombre, valor: g.valor, color: colorDe(g.color, c) }));
}

function Aportaciones({ datos, productos, desde, c }: { datos: PanelDatos; productos: ProductoCalculado[]; desde: string; c: Colores }) {
  const am = datos.aportacionesMensuales;
  const idx = am.meses.findIndex((m) => m >= desde.slice(0, 7));
  const j0 = idx < 0 ? am.meses.length : idx;
  const series = productos
    .filter((p) => (am.porProducto[p.id] ?? []).some((v) => v))
    .map((p) => ({ nombre: p.corto || p.nombre, color: colorDe(p.slotColor, c), valores: am.porProducto[p.id].slice(j0) }));
  const meses = am.meses.slice(j0);
  const suma = series.reduce((s, x) => s + x.valores.reduce((a, v) => a + Math.max(0, v || 0), 0), 0);
  return (
    <>
      <BarrasMensuales meses={meses} series={series} c={c} />
      {meses.length > 0 && (
        <Text style={[estilos.pequeno, { color: c.tinta3, marginTop: 4 }]}>
          {fmtEuros(suma)} en {meses.length} {meses.length === 1 ? 'mes' : 'meses'}
        </Text>
      )}
    </>
  );
}

function FilaProducto({ p, serie, c }: { p: ProductoCalculado; serie: (number | null)[]; c: Colores }) {
  const color = colorDe(p.slotColor, c);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/producto/[id]', params: { id: p.id } })}
      style={[estilos.producto, { backgroundColor: c.sup, borderColor: c.borde }]}
    >
      <View style={[estilos.punto, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={1}>{p.corto || p.nombre}</Text>
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{fmtPct(p.peso).replace('+', '')} del total</Text>
      </View>
      <Mini valores={serie} color={color} />
      <View style={{ alignItems: 'flex-end', minWidth: 86 }}>
        <Text style={{ color: c.tinta, fontWeight: '600' }}>{fmtEuros(p.valor)}</Text>
        <Text style={[estilos.pequeno, { color: colorSigno(p.rentabilidad, c) }]}>{fmtPct(p.rentabilidad)}</Text>
      </View>
    </Pressable>
  );
}

function Tarjeta({ c, children }: { c: Colores; children: React.ReactNode }) {
  return <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>{children}</View>;
}

function Dato({ c, titulo, valor, color }: { c: Colores; titulo: string; valor: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{titulo}</Text>
      <Text style={{ color, fontWeight: '700', fontSize: 16 }}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 6 },
  etiqueta: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  titulo: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cifra: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  fila: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  pequeno: { fontSize: 12 },
  seccion: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  aviso: { fontSize: 13, fontWeight: '600' },
  producto: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIO, borderWidth: 1 },
  punto: { width: 10, height: 10, borderRadius: 5 },
});

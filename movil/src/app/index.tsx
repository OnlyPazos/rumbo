/**
 * Panel (primera versión): patrimonio, ganancia, rentabilidad y la lista de productos.
 * Es el «hola mundo» de punta a punta con el backend; las gráficas y el resto de pantallas
 * del panel original llegan en los siguientes pasos.
 */
import { Link, Redirect, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorRumbo } from '@/api/cliente';
import type { ProductoCalculado, RespuestaPanel } from '@/api/tipos';
import { PieCreditos } from '@/componentes/Creditos';
import { fmtEuros, fmtFecha, fmtPct } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { RADIO, colorDe, colorSigno, useColores, type Colores } from '@/tema';

export default function Panel() {
  const c = useColores();
  const { cargando, cliente } = useSesion();
  const [panel, setPanel] = useState<RespuestaPanel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    try {
      const r = await cliente.cargarPanel();
      setError(null);
      setPanel(r);
    } catch (e) {
      setError(e instanceof ErrorRumbo ? e.message : String(e));
    }
  }, [cliente]);

  // Primera carga (y cada vez que cambia la conexión). Reintentar y refrescar usan cargar().
  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.cargarPanel().then(
      (r) => vigente && (setError(null), setPanel(r)),
      (e) => vigente && setError(e instanceof ErrorRumbo ? e.message : String(e)),
    );
    return () => {
      vigente = false;
    };
  }, [cliente]);

  async function actualizarPrecios() {
    if (!cliente) return;
    setRecargando(true);
    try {
      await cliente.actualizarPrecios();
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorRumbo ? e.message : String(e));
    } finally {
      setRecargando(false);
    }
  }

  if (cargando) return <Centro><ActivityIndicator /></Centro>;
  if (!cliente) return <Redirect href="/conectar" />;

  const datos = panel?.datos;
  const productos = datos ? [...datos.productos, ...datos.otrosActivos].sort((a, b) => b.valor - a.valor) : [];

  return (
    <>
      <Stack.Screen
        options={{
          title: datos?.titular ?? 'Rumbo',
          headerRight: () => (
            <Link href="/conectar" style={{ color: c.acento, fontSize: 15 }}>Conexión</Link>
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
            <Pressable onPress={cargar}><Text style={{ color: c.acento, marginTop: 8 }}>Reintentar</Text></Pressable>
          </Tarjeta>
        )}

        {!panel && !error && <ActivityIndicator style={{ marginTop: 40 }} />}

        {panel && !datos && (
          <Tarjeta c={c}>
            <Text style={{ color: c.tinta2 }}>Tu cartera está vacía: añade productos y movimientos para ver el panel.</Text>
          </Tarjeta>
        )}

        {datos && (
          <>
            {datos.modo === 'demo' && (
              <Text style={[estilos.aviso, { color: c.aviso }]}>Estás viendo la cartera de ejemplo.</Text>
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

            <Text style={[estilos.seccion, { color: c.tinta }]}>Productos</Text>
            {productos.map((p) => <FilaProducto key={p.id} p={p} c={c} />)}

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

function FilaProducto({ p, c }: { p: ProductoCalculado; c: Colores }) {
  return (
    <View style={[estilos.producto, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <View style={[estilos.punto, { backgroundColor: colorDe(p.slotColor, c) }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={1}>{p.corto || p.nombre}</Text>
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{fmtPct(p.peso)} del total</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: c.tinta, fontWeight: '600' }}>{fmtEuros(p.valor)}</Text>
        <Text style={[estilos.pequeno, { color: colorSigno(p.rentabilidad, c) }]}>{fmtPct(p.rentabilidad)}</Text>
      </View>
    </View>
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

function Centro({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 18, gap: 6 },
  etiqueta: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cifra: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  fila: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  pequeno: { fontSize: 12 },
  seccion: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  aviso: { fontSize: 13, fontWeight: '600' },
  producto: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIO, borderWidth: 1 },
  punto: { width: 10, height: 10, borderRadius: 5 },
});

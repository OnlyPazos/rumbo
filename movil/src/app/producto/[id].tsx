/**
 * Ficha de un producto: la pestaña «Productos» del panel original de Rumbo (pintaFichaFondo y
 * pintaTablaFondo en app/web/app.js). Cifras, evolución (tu posición o el precio), rentabilidad
 * del precio por periodos, datos y sus movimientos, que se pueden tocar para editarlos.
 */
import { Link, router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ErrorRumbo } from '@/api/cliente';
import type { Cartera, Modo, Movimiento, PanelDatos, ProductoCalculado, Valoracion } from '@/api/tipos';
import { PieCreditos } from '@/componentes/Creditos';
import { QueHayDentro } from '@/componentes/Exposicion';
import { Segmentos } from '@/componentes/Segmentos';
import { fmtEuros, fmtFecha, fmtPct, fmtUnidades } from '@/formato';
import { RANGOS, desdeIdx, type Rango } from '@/graficos/escala';
import { Evolucion } from '@/graficos/Evolucion';
import { useSesion } from '@/sesion/contexto';
import { RADIO, colorDe, colorSigno, useColores, type Colores } from '@/tema';

const NOMBRE_MOV: Record<string, string> = {
  compra: 'Compra', venta: 'Venta', dividendo: 'Dividendo o interés', comision: 'Comisión', ajuste: 'Ajuste de participaciones',
};
/** Una fila de la lista: un movimiento o un saldo anotado. */
type Fila = { tipo: 'mov'; id: string; fecha: string; m: Movimiento } | { tipo: 'val'; id: string; fecha: string; v: Valoracion };

const VENTANAS: [keyof NonNullable<ProductoCalculado['ventanas']>, string][] = [
  ['1m', '1 mes'], ['3m', '3 meses'], ['6m', '6 meses'], ['ytd', 'En el año'], ['1a', '1 año'],
];

/** Precios: con céntimos si son pequeños (un fondo a 12,34 €), sin ellos si son grandes. */
const fmtPrecio = (v: number | null) => fmtEuros(v, v != null && Math.abs(v) < 500);

export default function Ficha() {
  const c = useColores();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cliente } = useSesion();
  const [datos, setDatos] = useState<PanelDatos | null>(null);
  const [cartera, setCartera] = useState<Cartera | null>(null);
  const [modo, setModo] = useState<Modo>('propio');
  const [error, setError] = useState<string | null>(null);
  const [rango, setRango] = useState<Rango>('todo');
  const [serie, setSerie] = useState<'posicion' | 'precio'>('posicion');

  // Se recarga al volver de editar un movimiento.
  useFocusEffect(
    useCallback(() => {
      if (!cliente) return;
      let vigente = true;
      Promise.all([cliente.cargarPanel(), cliente.cartera()]).then(
        ([panel, car]) => {
          if (!vigente) return;
          setError(null);
          setDatos(panel.datos);
          setCartera(car.cartera);
          setModo(car.modo);
        },
        (e) => vigente && setError(e instanceof ErrorRumbo ? e.message : String(e)),
      );
      return () => {
        vigente = false;
      };
    }, [cliente]),
  );

  const p = datos ? [...datos.productos, ...datos.otrosActivos, ...datos.pasivos].find((x) => x.id === id) : undefined;

  if (error) return <Centro><Text style={{ color: c.mal, padding: 20 }}>{error}</Text></Centro>;
  if (!datos || !cartera) return <Centro><ActivityIndicator /></Centro>;
  if (!p) return <Centro><Text style={{ color: c.tinta2, padding: 20 }}>Ese producto ya no está en la cartera.</Text></Centro>;

  const color = colorDe(p.slotColor, c);
  const hayPrecio = Boolean(p.navSerie?.some((v) => v));
  const verPrecio = hayPrecio && serie === 'precio';
  // Empieza donde empieza el producto: sin un tramo vacío si llegó más tarde que el resto.
  const primerDato = Math.max(0, p.serie.findIndex((v) => v != null && v > 0));
  const i0 = Math.max(desdeIdx(datos.fechas, datos.fechaExtracto, rango), verPrecio ? 0 : primerDato);
  const corta = <T,>(arr: T[] | undefined) => (arr ?? []).slice(i0);
  const conAportado = (p.serieAportado ?? []).some((v) => v);
  const editable = modo === 'propio';

  const movimientos: Fila[] = [
    ...cartera.movimientos
      .filter((m) => m.producto === p.id || m.destino === p.id)
      .map((m): Fila => ({ tipo: 'mov', id: m.id, fecha: m.fecha, m })),
    ...cartera.valoraciones
      .filter((v) => v.producto === p.id)
      .map((v): Fila => ({ tipo: 'val', id: v.id, fecha: v.fecha, v })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const nombreDe = (pid?: string) => {
    const x = cartera.productos.find((q) => q.id === pid);
    return x ? x.corto || x.nombre : pid ?? '';
  };

  const campos: [string, string | null | undefined][] = [
    ['Tipo', p.tipoDetalle || p.tipo],
    ['ISIN o código', p.identificador || p.codigo],
    ['Índice que replica', p.indice as string | undefined],
    ['Comisión anual (TER)', p.ter != null ? fmtPct(p.ter).replace('+', '') : null],
    ['Entidad', p.entidad], ['Gestora', p.gestora],
    [p.aportaciones?.length ? 'Primera aportación' : 'Primer dato anotado', p.desde ? fmtFecha(p.desde) : null],
    [p.etqUnidades || 'Participaciones', p.participaciones != null ? fmtUnidades(p.participaciones) : null],
    ['Precio medio de compra', p.precioMedio != null ? fmtPrecio(p.precioMedio) : null],
    [p.etqPrecio || 'Valor liquidativo', p.nav != null ? `${fmtPrecio(p.nav)}${p.navFecha ? ` · ${fmtFecha(p.navFecha)}` : ''}` : null],
    ['Fuente del precio', p.fuenteTexto || p.fuentePrecio],
    ['Peso en el patrimonio', p.peso != null ? fmtPct(p.peso).replace('+', '') : null],
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: p.corto || p.nombre,
          headerRight: editable
            ? () => (
              <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
                <Link href={{ pathname: '/editar-producto', params: { id: p.id } }} style={{ color: c.tinta2, fontSize: 15 }}>
                  Editar
                </Link>
                <Link href={{ pathname: '/anotar', params: { producto: p.id } }} style={{ color: c.acento, fontSize: 15, fontWeight: '700' }}>
                  + Anotar
                </Link>
              </View>
            )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={estilos.pagina}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[estilos.punto, { backgroundColor: color }]} />
          <Text style={[estilos.nombre, { color: c.tinta }]}>{p.nombre}</Text>
        </View>

        <Tarjeta c={c}>
          <Text style={[estilos.etiqueta, { color: c.tinta3 }]}>Vale hoy</Text>
          <Text style={[estilos.cifra, { color: c.tinta }]}>{fmtEuros(p.valor)}</Text>
          <View style={estilos.fila}>
            <Dato c={c} titulo="Aportado" valor={fmtEuros(p.aportado)} />
            <Dato c={c} titulo="Ganancia" valor={fmtEuros(p.plusvalia)} color={colorSigno(p.plusvalia, c)} />
          </View>
          <View style={estilos.fila}>
            <Dato c={c} titulo="Rentabilidad" valor={fmtPct(p.rentabilidad)} color={colorSigno(p.rentabilidad, c)} />
            <Dato c={c} titulo="TIR anual" valor={fmtPct(p.tir)} color={colorSigno(p.tir, c)} />
          </View>
          {p.cobros && (p.cobros.ventas || p.cobros.dividendos || p.cobros.gastos) ? (
            <Text style={[estilos.pequeno, { color: c.tinta2 }]}>
              Ganancia total {fmtEuros(p.gananciaTotal)} ({fmtPct(p.rentabilidadTotal)}):{' '}
              {[
                p.plusvalia ? `${fmtEuros(p.plusvalia)} de lo que aún tienes` : null,
                p.cobros.ventas ? `${fmtEuros(p.cobros.ventas)} en ventas` : null,
                p.cobros.dividendos ? `${fmtEuros(p.cobros.dividendos)} en dividendos e intereses` : null,
                p.cobros.gastos ? `${fmtEuros(-p.cobros.gastos)} en comisiones aparte` : null,
              ].filter(Boolean).join(' · ')}.
            </Text>
          ) : null}
        </Tarjeta>

        <Segmentos opciones={RANGOS} activo={rango} alCambiar={setRango} />
        <Tarjeta c={c}>
          {hayPrecio && (
            <Segmentos
              opciones={[{ id: 'posicion', et: 'Mi posición' }, { id: 'precio', et: p.etqPrecio || 'Valor liquidativo' }] as const}
              activo={serie} alCambiar={setSerie}
            />
          )}
          <Evolucion
            key={serie}
            c={c} color={color} alto={230}
            fechas={corta(datos.fechas)}
            valores={corta(verPrecio ? p.navSerie : p.serie)}
            aportado={!verPrecio && conAportado ? corta(p.serieAportado) : undefined}
            nombre={verPrecio ? p.etqPrecio || 'Valor liquidativo' : 'Valor'}
            desdeCero={!verPrecio}
            formato={verPrecio ? fmtPrecio : undefined}
            formatoEje={verPrecio ? (v) => fmtPrecio(v) : undefined}
          />
          {verPrecio && p.precioMedio != null && (
            <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Tu precio medio de compra: {fmtPrecio(p.precioMedio)}</Text>
          )}
        </Tarjeta>

        {p.ventanas && VENTANAS.some(([k]) => p.ventanas?.[k] != null) && (
          <Tarjeta c={c}>
            <Text style={[estilos.titulo, { color: c.tinta }]}>{p.etqVentanas || 'El precio'}, lo tuvieras o no</Text>
            <View style={estilos.ventanas}>
              {VENTANAS.filter(([k]) => p.ventanas?.[k] != null).map(([k, et]) => (
                <View key={k} style={{ minWidth: 80 }}>
                  <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{et}</Text>
                  <Text style={{ color: colorSigno(p.ventanas![k], c), fontWeight: '700' }}>{fmtPct(p.ventanas![k])}</Text>
                </View>
              ))}
            </View>
          </Tarjeta>
        )}

        <QueHayDentro e={p.exposicion} color={color} fechaExtracto={datos.fechaExtracto} c={c} />

        <Tarjeta c={c}>
          <Text style={[estilos.titulo, { color: c.tinta }]}>Datos</Text>
          {campos.filter(([, v]) => v).map(([k, v]) => (
            <View key={k} style={[estilos.dato, { borderColor: c.borde }]}>
              <Text style={{ color: c.tinta3, flex: 1 }}>{k}</Text>
              <Text style={{ color: c.tinta, flex: 1.4, textAlign: 'right' }}>{v}</Text>
            </View>
          ))}
        </Tarjeta>

        <Tarjeta c={c}>
          <Text style={[estilos.titulo, { color: c.tinta }]}>Movimientos y saldos</Text>
          {!movimientos.length && <Text style={{ color: c.tinta3 }}>Aún no hay nada anotado.</Text>}
          {movimientos.map((x) => {
            const esVal = x.tipo === 'val';
            const m = x.tipo === 'mov' ? x.m : null;
            const titulo = !m ? 'Saldo / valor anotado'
              : m.tipo === 'traspaso' ? (m.producto === p.id ? `Traspaso a ${nombreDe(m.destino)}` : `Traspaso desde ${nombreDe(m.producto)}`)
              : NOMBRE_MOV[m.tipo] ?? m.tipo;
            const importe = x.tipo === 'val' ? x.v.valor : x.m.importe;
            const sale = Boolean(m && (m.tipo === 'venta' || (m.tipo === 'traspaso' && m.producto === p.id)));
            const unidades = !m ? null : m.tipo === 'traspaso' && m.destino === p.id ? m.unidadesDestino : m.unidades;
            // Los ajustes de participaciones se cambian desde el panel web (aquí no hay formulario para ellos).
            const editableEste = editable && m?.tipo !== 'ajuste';
            return (
              <Pressable
                key={`${x.tipo}-${x.id}`}
                disabled={!editableEste}
                onPress={() => router.push({ pathname: '/anotar', params: esVal ? { val: x.id } : { mov: x.id } })}
                style={[estilos.mov, { borderColor: c.borde }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={1}>{titulo}</Text>
                  <Text style={[estilos.pequeno, { color: c.tinta3 }]} numberOfLines={1}>
                    {fmtFecha(x.fecha)}{unidades ? ` · ${fmtUnidades(unidades)} ${(p.etqUnidades || 'part.').toLowerCase()}` : ''}{m?.nota ? ` · ${m.nota}` : ''}
                  </Text>
                </View>
                <Text style={{ color: sale ? c.tinta2 : c.tinta, fontWeight: '600' }}>
                  {sale ? '−' : ''}{fmtEuros(importe, true)}
                </Text>
                {editableEste && <Text style={{ color: c.tinta3, fontSize: 18 }}>›</Text>}
              </Pressable>
            );
          })}
          {!editable && (
            <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
              {modo === 'demo' ? 'En la cartera de ejemplo no se pueden cambiar movimientos.' : 'En «Todos juntos» solo se puede mirar.'}
            </Text>
          )}
        </Tarjeta>
        <PieCreditos />
      </ScrollView>
    </>
  );
}

function Tarjeta({ c, children }: { c: Colores; children: React.ReactNode }) {
  return <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>{children}</View>;
}

function Dato({ c, titulo, valor, color }: { c: Colores; titulo: string; valor: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{titulo}</Text>
      <Text style={{ color: color ?? c.tinta, fontWeight: '700', fontSize: 16 }}>{valor}</Text>
    </View>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' },
  nombre: { fontSize: 18, fontWeight: '700', flex: 1 },
  punto: { width: 12, height: 12, borderRadius: 4 },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 8 },
  etiqueta: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  titulo: { fontSize: 16, fontWeight: '700' },
  cifra: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  fila: { flexDirection: 'row', gap: 12 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  ventanas: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  dato: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  mov: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});

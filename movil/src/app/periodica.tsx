/**
 * Aportación periódica: la de cada mes a un fondo, ETF o plan (formPeriodica en app/web/editor.js y
 * app/periodicas.py de Rumbo). Rumbo prepara una compra por mes con el precio de cierre de ese día;
 * primero se ven, y solo se añaden al confirmar. Las que ya están anotadas se saltan.
 *
 * Parámetros (al venir de un aviso): ?producto=&importe=&dia=&desde=
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ErrorRumbo } from '@/api/cliente';
import type { Modo, PeticionPeriodica, PlanPeriodica, Producto } from '@/api/tipos';
import { Boton, Campo, Chips } from '@/componentes/Formulario';
import { fechaDesdeTexto, fmtEuros, fmtFecha, fmtUnidades, hoyISO } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { usePanel } from '@/sesion/panel';
import { RADIO, useColores } from '@/tema';

const ESTADO = { nueva: 'Se añade', repetida: 'Ya la tienes', sinPrecio: 'Sin precio' } as const;

export default function Periodica() {
  const c = useColores();
  const { cliente } = useSesion();
  const { cargar } = usePanel();
  const param = useLocalSearchParams<{ producto?: string; importe?: string; dia?: string; desde?: string }>();

  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [modo, setModo] = useState<Modo>('propio');
  const [producto, setProducto] = useState<string | null>(param.producto ?? null);
  const [importe, setImporte] = useState(param.importe ? param.importe.replace('.', ',') : '');
  const [dia, setDia] = useState(param.dia ?? '1');
  const [desde, setDesde] = useState(param.desde ? fmtFecha(param.desde) : '');
  const [hasta, setHasta] = useState(fmtFecha(hoyISO()));
  const [plan, setPlan] = useState<PlanPeriodica | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.cartera().then(
      (r) => {
        if (!vigente) return;
        const lista = r.cartera.productos.filter((p) => p.tipo !== 'efectivo' && p.tipo !== 'deuda');
        setProductos(lista);
        setModo(r.modo);
        setProducto((x) => x ?? lista[0]?.id ?? null);
      },
      (e) => vigente && setErrores([e instanceof ErrorRumbo ? e.message : String(e)]),
    );
    return () => {
      vigente = false;
    };
  }, [cliente]);

  /** Lo que se manda al backend (los números, tal cual se escriben). */
  function peticion(): PeticionPeriodica | null {
    const d = fechaDesdeTexto(desde);
    const h = fechaDesdeTexto(hasta);
    const faltan = [!producto && 'Elige el producto.', !d && 'Pon desde cuándo, como 01/01/2025.', !h && 'La fecha «hasta» no es válida.'].filter(Boolean) as string[];
    if (faltan.length) {
      setErrores(faltan);
      return null;
    }
    return { producto: producto!, importe, dia, desde: d!, hasta: h! };
  }

  /** Al cambiar cualquier dato, la lista vista ya no vale. */
  const cambia = <T,>(fijar: (v: T) => void) => (v: T) => {
    fijar(v);
    setPlan(null);
  };

  async function ver() {
    const datos = peticion();
    if (!cliente || !datos) return;
    setErrores([]);
    setOcupado(true);
    try {
      setPlan((await cliente.verPeriodicas(datos)).plan);
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
    } finally {
      setOcupado(false);
    }
  }

  async function anadir() {
    const datos = peticion();
    if (!cliente || !datos) return;
    setOcupado(true);
    try {
      await cliente.crearPeriodicas(datos);
      await cargar();
      router.back();
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
      setOcupado(false);
    }
  }

  if (!productos) {
    return <View style={[estilos.centro, { backgroundColor: c.plano }]}>{errores.length ? <Text style={{ color: c.mal }}>{errores[0]}</Text> : <ActivityIndicator />}</View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Aportación periódica' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
          <Text style={{ color: c.tinta2, lineHeight: 21 }}>
            ¿Aportas lo mismo cada mes a un fondo, un ETF o un plan? Dile a Rumbo cuánto, qué día y desde cuándo, y prepara
            una compra por mes con el precio de cierre de ese día.
          </Text>
          {modo !== 'propio' && (
            <Text style={[estilos.aviso, { color: c.aviso, borderColor: c.aviso }]}>
              {modo === 'demo' ? 'En la cartera de ejemplo no se puede guardar: empieza la tuya desde el panel.' : 'En «Todos juntos» solo se puede mirar.'}
            </Text>
          )}

          {productos.length ? (
            <Chips opciones={productos.map((p) => ({ id: p.id, et: p.corto || p.nombre }))} activo={producto} alCambiar={cambia(setProducto)} />
          ) : (
            <Text style={{ color: c.tinta3 }}>Primero añade un fondo, un ETF o un plan.</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 2 }}>
              <Campo etiqueta="Cuánto cada mes (€)" value={importe} onChangeText={cambia(setImporte)} placeholder="200,00" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Qué día" value={dia} onChangeText={cambia(setDia)} placeholder="1" keyboardType="number-pad" maxLength={2} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Desde" value={desde} onChangeText={cambia(setDesde)} placeholder="01/01/2025" keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Hasta" value={hasta} onChangeText={cambia(setHasta)} keyboardType="numbers-and-punctuation" />
            </View>
          </View>
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
            Son estimadas: tu banco puede ejecutarlas otro día o a otro precio. Si ese día no hay cierre, se usa el anterior.
            Después puedes corregir cada una en su ficha. Las que ya tengas anotadas se saltan.
          </Text>

          {errores.map((e, i) => <Text key={i} style={{ color: c.mal }}>{e}</Text>)}
          <Boton texto={plan ? 'Volver a calcular' : 'Ver las aportaciones'} tipo={plan ? 'secundario' : 'principal'} alPulsar={ver} ocupado={ocupado && !plan} />

          {plan && (
            <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
              <Text style={{ color: c.tinta, fontWeight: '700' }}>
                {plan.nuevas} {plan.nuevas === 1 ? 'aportación nueva' : 'aportaciones nuevas'} de {fmtEuros(plan.importe, true)} a {plan.nombre}
              </Text>
              {plan.lineas.map((l) => (
                <View key={l.fecha} style={[estilos.fila, { borderColor: c.borde, opacity: l.estado === 'nueva' ? 1 : 0.55 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.tinta }}>{fmtFecha(l.fecha)}</Text>
                    <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
                      {l.precio != null
                        ? `${fmtUnidades(l.unidades)} part. a ${l.precio.toLocaleString('es-ES', { maximumFractionDigits: 4 })} €${l.fechaPrecio && l.fechaPrecio !== l.fecha ? ` (cierre del ${fmtFecha(l.fechaPrecio)})` : ''}`
                        : plan.aMano ? 'Se valora a mano: sin participaciones' : '—'}
                    </Text>
                  </View>
                  <Text style={[estilos.pequeno, { color: l.estado === 'nueva' ? c.bien : l.estado === 'sinPrecio' ? c.aviso : c.tinta3, fontWeight: '600' }]}>
                    {ESTADO[l.estado]}
                  </Text>
                </View>
              ))}
              {plan.lineas.some((l) => l.estado === 'sinPrecio') && (
                <Text style={[estilos.pequeno, { color: c.aviso }]}>
                  Las que no tienen precio no se añaden: actualiza los precios (desliza hacia abajo en el panel) y vuelve a calcular.
                </Text>
              )}
              <Boton
                texto={plan.nuevas ? `Añadir ${plan.nuevas}` : 'No hay nada nuevo que añadir'}
                alPulsar={anadir} ocupado={ocupado} desactivado={!plan.nuevas || modo !== 'propio'}
              />
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Rumbo la recordará y te avisará en el panel cuando toque la siguiente.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pagina: { padding: 16, gap: 14, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  aviso: { borderWidth: 1, borderRadius: RADIO, padding: 12, fontSize: 14 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 14, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
});

/**
 * Mi reparto objetivo (formReparto en app/web/editor.js de Rumbo): qué % quieres en cada tipo de
 * activo o en cada producto, los márgenes del semáforo y qué productos cuentan.
 * Cada interruptor sigue la regla general (cuentaPorDefecto) hasta que lo tocas; lo elegido a mano manda,
 * y solo se guarda lo que difiere de la regla, como en la web.
 */
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ErrorRumbo } from '@/api/cliente';
import type { Modo, ProductoCalculado } from '@/api/tipos';
import { TIPOS_REPARTO, cuentaEnReparto, cuentaPorDefecto, normalizaReparto, tipoReparto, type Reparto } from '@/calculos';
import { Boton, Campo, Chips, confirmar } from '@/componentes/Formulario';
import { numEs } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { usePanel } from '@/sesion/panel';
import { RADIO, colorDe, useColores } from '@/tema';

type Por = 'clase' | 'producto';
const decimal = (x: number | undefined) => (x == null ? '' : x.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false }));

export default function RepartoObjetivoFormulario() {
  const c = useColores();
  const { cliente } = useSesion();
  const { panel, cargar } = usePanel();
  const [guardado, setGuardado] = useState<Reparto | null>(null);
  const [modo, setModo] = useState<Modo>('propio');
  const [listo, setListo] = useState(false);
  const [por, setPor] = useState<Por>('clase');
  const [pesos, setPesos] = useState<Record<string, string>>({});
  const [vigilar, setVigilar] = useState('3');
  const [rebalancear, setRebalancear] = useState('5');
  const [conEfectivo, setConEfectivo] = useState(false);
  const [elegidos, setElegidos] = useState<Record<string, boolean>>({});
  const [errores, setErrores] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.cartera().then((r) => {
      if (!vigente) return;
      setModo(r.modo);
      const o = normalizaReparto(r.cartera.objetivoReparto as Reparto | undefined) ?? null;
      setGuardado(o);
      if (o) {
        setPor(o.por);
        setPesos(Object.fromEntries(Object.entries(o.pesos).map(([k, v]) => [k, decimal(v)])));
        setVigilar(decimal(o.vigilar));
        setRebalancear(decimal(o.rebalancear));
        setConEfectivo(Boolean(o.conEfectivo));
        setElegidos({ ...(o.cuenta ?? {}) });
      }
      setListo(true);
    }, (e) => vigente && setErrores([e instanceof ErrorRumbo ? e.message : String(e)]));
    return () => {
      vigente = false;
    };
  }, [cliente]);

  const datos = panel?.datos;
  if (!listo || !datos) {
    return <View style={[estilos.centro, { backgroundColor: c.plano }]}>{errores.length ? <Text style={{ color: c.mal }}>{errores[0]}</Text> : <ActivityIndicator />}</View>;
  }

  const productos: ProductoCalculado[] = [...datos.productos, ...datos.otrosActivos].filter((p) => p.valor > 0 && p.tipoClave !== 'deuda');
  // Los grupos posibles, con lo que tiene dentro cada uno (los del reparto guardado, aunque estén vacíos).
  const mapa = new Map<string, ProductoCalculado[]>();
  productos.forEach((p) => {
    const k = por === 'producto' ? p.corto || p.nombre : tipoReparto(p);
    mapa.set(k, [...(mapa.get(k) ?? []), p]);
  });
  Object.keys(guardado?.por === por ? guardado.pesos : {}).forEach((k) => {
    if (!mapa.has(k)) mapa.set(k, []);
  });
  const orden = por === 'producto' ? [] : TIPOS_REPARTO;
  const grupos = [...mapa.entries()].sort((a, b) => (orden.indexOf(a[0]) + 1 || 99) - (orden.indexOf(b[0]) + 1 || 99));

  /** Los pesos escritos, como números (los vacíos o a 0 no cuentan). */
  const pesosNum = Object.fromEntries(
    Object.entries(pesos).filter(([k]) => mapa.has(k)).map(([k, v]) => [k, numEs(v) ?? 0]).filter(([, v]) => (v as number) > 0),
  ) as Record<string, number>;
  const suma = Object.values(pesosNum).reduce((a, b) => a + b, 0);
  const borrador: Reparto = { por, pesos: pesosNum, vigilar: 3, rebalancear: 5, conEfectivo, cuenta: elegidos };
  const cuenta = (p: ProductoCalculado) => cuentaEnReparto(p, borrador);

  /** Solo lo elegido a mano que se aparta de la regla general (eleccionCuenta en la web). */
  function eleccionCuenta() {
    const regla: Reparto = { ...borrador, cuenta: {} };
    const out: Record<string, boolean> = {};
    productos.forEach((p) => {
      if (Object.prototype.hasOwnProperty.call(elegidos, p.id) && elegidos[p.id] !== cuentaPorDefecto(p, regla)) out[p.id] = elegidos[p.id];
    });
    return out;
  }

  async function guardar(borrar = false) {
    if (!cliente) return;
    if (borrar && !(await confirmar('Reparto objetivo', '¿Quitar tu reparto objetivo?', 'Quitar'))) return;
    setOcupado(true);
    setErrores([]);
    try {
      await cliente.guardarReparto(borrar ? { borrar: true }
        : { por, pesos: pesosNum, vigilar, rebalancear, conEfectivo, cuenta: eleccionCuenta() });
      await cargar();
      router.back();
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
      setOcupado(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Reparto objetivo' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
          <Text style={{ color: c.tinta2, lineHeight: 21 }}>
            ¿Qué parte de tu dinero quieres en cada sitio? Rumbo compara con lo que tienes y te dice dónde meter la próxima
            aportación para volver a cuadrar, sin vender nada.
          </Text>
          {modo !== 'propio' && (
            <Text style={{ color: c.aviso }}>{modo === 'demo' ? 'En la cartera de ejemplo no se puede guardar.' : 'En «Todos juntos» solo se puede mirar.'}</Text>
          )}
          <Chips opciones={[{ id: 'clase', et: 'Por tipo de activo' }, { id: 'producto', et: 'Por producto' }] as const} activo={por} alCambiar={setPor} />
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
            {por === 'producto'
              ? 'Cada fondo, acción o cuenta por separado: por ejemplo, 80 % al fondo del mundo y 20 % al de emergentes.'
              : 'Grupos grandes: toda la bolsa junta, la renta fija, el monetario… Para repartir entre fondos concretos, elige «Por producto».'}
          </Text>

          {grupos.map(([nombre, de]) => (
            <View key={nombre} style={[estilos.grupo, { backgroundColor: c.sup, borderColor: c.borde }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: c.tinta, fontWeight: '700', flex: 1 }} numberOfLines={1}>{nombre}</Text>
                <TextInput
                  value={pesos[nombre] ?? ''} onChangeText={(v) => setPesos((x) => ({ ...x, [nombre]: v }))}
                  placeholder="0" placeholderTextColor={c.tinta3} keyboardType="decimal-pad"
                  style={[estilos.pct, { color: c.tinta, backgroundColor: c.sup2, borderColor: c.borde }]}
                />
                <Text style={{ color: c.tinta2 }}>%</Text>
              </View>
              {de.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[estilos.punto, { backgroundColor: colorDe(p.slotColor, c) }]} />
                  <Text style={[estilos.pequeno, { color: cuenta(p) ? c.tinta2 : c.tinta3, flex: 1 }]} numberOfLines={1}>
                    {p.corto || p.nombre}{cuenta(p) ? '' : ' · no cuenta'}
                  </Text>
                  <Switch
                    value={cuenta(p)} onValueChange={(v) => setElegidos((x) => ({ ...x, [p.id]: v }))}
                    trackColor={{ true: c.acento, false: c.sup3 }}
                  />
                </View>
              ))}
            </View>
          ))}

          <Text style={{ color: Math.abs(suma - 100) <= 0.5 ? c.bien : c.aviso, fontWeight: '700' }}>
            Suma: {suma.toLocaleString('es-ES', { maximumFractionDigits: 2 })} % {Math.abs(suma - 100) <= 0.5 ? '✓' : '(tienen que sumar 100 %)'}
          </Text>
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
            Las cuentas solo cuentan si les pones un %. Con el interruptor de cada producto decides si cuenta para este reparto;
            solo cambia el reparto: sigue en tu patrimonio, tus gráficas y tus totales.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="OK hasta (puntos)" value={vigilar} onChangeText={setVigilar} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Rebalancear desde" value={rebalancear} onChangeText={setRebalancear} keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.tinta, fontWeight: '600' }}>Contarlo todo</Text>
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>También las cuentas y lo que no es a largo plazo, aunque no les pongas %.</Text>
            </View>
            <Switch value={conEfectivo} onValueChange={setConEfectivo} trackColor={{ true: c.acento, false: c.sup3 }} />
          </View>

          {errores.map((e, i) => <Text key={i} style={{ color: c.mal }}>{e}</Text>)}
          <Boton texto="Guardar" alPulsar={() => guardar()} ocupado={ocupado} desactivado={modo !== 'propio'} />
          {guardado && <Boton texto="Quitar mi reparto objetivo" tipo="peligro" alPulsar={() => guardar(true)} desactivado={ocupado || modo !== 'propio'} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pagina: { padding: 16, gap: 12, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  grupo: { borderWidth: 1, borderRadius: RADIO, padding: 12, gap: 8 },
  pct: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 70, textAlign: 'right', fontSize: 15 },
  punto: { width: 8, height: 8, borderRadius: 4 },
});

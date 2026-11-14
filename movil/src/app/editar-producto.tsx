/**
 * Añadir o editar un producto, con el buscador (formProducto en app/web/editor.js de Rumbo).
 * ?id=<id> para editar. Al crear uno, sigue en «Anotar» con su primer dato, como en la web.
 *
 * Ojo: el backend borra los campos de texto que no se le mandan (guarda_producto en app/almacen.py),
 * así que al editar se parte del producto entero tal como está guardado y se manda todo.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorRumbo } from '@/api/cliente';
import type { Cartera, Fuente, Modo, Producto, ResultadoBusqueda, TipoProducto } from '@/api/tipos';
import { Boton, Campo, Chips, confirmar } from '@/componentes/Formulario';
import { fmtFecha } from '@/formato';
import { INICIO } from '@/navegacion/rutas';
import { useSesion } from '@/sesion/contexto';
import { RADIO, colorSlot, useColores } from '@/tema';

const SOLO_SALDO: TipoProducto[] = ['efectivo', 'deuda'];

/** Texto de un número para un campo (coma decimal). */
const decimal = (x: number | null | undefined) => (x == null ? '' : x.toLocaleString('es-ES', { maximumFractionDigits: 4, useGrouping: false }));

type Formulario = Record<string, string | number | boolean | null | undefined>;

export default function EditarProducto() {
  const c = useColores();
  const { cliente } = useSesion();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const nuevo = !id;

  const [cartera, setCartera] = useState<Cartera | null>(null);
  const [modo, setModo] = useState<Modo>('propio');
  const [tipos, setTipos] = useState<Record<string, string>>({});
  const [fuentes, setFuentes] = useState<Record<string, string>>({});
  const [f, setF] = useState<Formulario>({ tipo: 'fondo', fuente: 'morningstar', moneda: 'EUR', largoPlazo: true });
  const [liquidezTocada, setLiquidezTocada] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [verAvanzado, setVerAvanzado] = useState(false);

  const [q, setQ] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const [avisoBusqueda, setAvisoBusqueda] = useState<string | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);

  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.cartera().then(
      (r) => {
        if (!vigente) return;
        setCartera(r.cartera);
        setModo(r.modo);
        setTipos(r.tipos);
        setFuentes(r.fuentes);
        const p = id ? r.cartera.productos.find((x) => x.id === id) : undefined;
        if (p) {
          // Todo el producto (también lo que este formulario no enseña), con la TER en %.
          setF({ ...(p as Formulario), ter: p.ter != null ? decimal(+(p.ter * 100).toFixed(4)) : '', riesgo: p.riesgo ?? '' });
          setLiquidezTocada(p.liquidez != null);
        } else {
          // Color: el que menos se use (siguienteColor en la web).
          const usos = Array.from({ length: 12 }, (_, i) => r.cartera.productos.filter((x) => x.slot === i + 1).length);
          setF((x) => ({ ...x, slot: usos.indexOf(Math.min(...usos)) + 1 }));
        }
      },
      (e) => vigente && setErrores([e instanceof ErrorRumbo ? e.message : String(e)]),
    );
    return () => {
      vigente = false;
    };
  }, [cliente, id]);

  if (!cliente) return null;
  if (!cartera) {
    return (
      <View style={[estilos.centro, { backgroundColor: c.plano }]}>
        {errores.length ? <Text style={{ color: c.mal, padding: 20 }}>{errores[0]}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  const pon = (k: string, v: Formulario[string]) => setF((x) => ({ ...x, [k]: v }));
  const texto = (k: string) => (f[k] == null ? '' : String(f[k]));
  const tipo = f.tipo as TipoProducto;
  const saldo = SOLO_SALDO.includes(tipo);
  const online = !saldo && f.fuente !== 'manual';
  const bloqueado = modo !== 'propio';
  const clases = [...new Set(cartera.productos.map((x) => x.clase).filter((x): x is string => Boolean(x)))];
  // Por defecto son liquidez las cuentas y los fondos monetarios (como en la web), hasta que se toque.
  const liquidezDefecto = tipo === 'efectivo' || /monetari/i.test(`${texto('nombre')} ${texto('clase')}`);
  const liquidez = liquidezTocada ? Boolean(f.liquidez) : liquidezDefecto;

  async function buscar() {
    if (!cliente || !q.trim()) return;
    setBuscando(true);
    setResultados(null);
    setAvisoBusqueda(null);
    setElegido(null);
    try {
      const r = await cliente.buscar(q.trim());
      setResultados(r.resultados);
      if (!r.resultados.length) {
        setAvisoBusqueda(r.sinConexion
          ? 'No he podido conectar con Yahoo o Morningstar. Comprueba la conexión de Rumbo e inténtalo otra vez.'
          : `No encuentro «${q.trim()}» con precio en internet. Prueba con el ISIN o elige «Valor anotado a mano».`);
      }
    } catch (e) {
      setAvisoBusqueda(e instanceof ErrorRumbo ? e.message : String(e));
    } finally {
      setBuscando(false);
    }
  }

  function elegir(i: number) {
    const r = resultados![i];
    const n = r.nombre || r.codigo;
    const fi = r.ficha ?? {};
    setElegido(i);
    setF((x) => ({
      ...x,
      nombre: n, corto: n.slice(0, 24).trim(), tipo: r.tipo, identificador: r.identificador,
      fuente: r.fuente, codigo: r.codigo, moneda: r.moneda || 'EUR', vivo: r.vivo || '',
      ter: fi.ter != null ? decimal(fi.ter) : x.ter, riesgo: fi.riesgo ?? x.riesgo, gestora: fi.gestora ?? x.gestora,
      clase: fi.clase ?? x.clase,
    }));
  }

  async function guardar() {
    if (!cliente) return;
    setErrores([]);
    setGuardando(true);
    try {
      const datos = { ...f, liquidez, id: id ?? undefined };
      const r = await cliente.guardarProducto(datos as Partial<Producto>);
      if (!nuevo) {
        router.back();
        return;
      }
      // Siguiente paso natural: su primer dato (un saldo si se valora a mano; si no, la compra).
      const manual = r.item.fuente === 'manual' || SOLO_SALDO.includes(r.item.tipo);
      router.replace({ pathname: '/anotar', params: { producto: r.item.id, tipo: manual ? 'saldo' : 'compra' } });
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!cliente || !id) return;
    const nm = cartera!.movimientos.filter((m) => m.producto === id || m.destino === id).length;
    const nv = cartera!.valoraciones.filter((v) => v.producto === id).length;
    const extra = nm || nv ? `\n\nSe borrarán también sus ${nm} movimientos y ${nv} valores anotados.` : '';
    const ok = await confirmar(`¿Borrar «${texto('corto') || texto('nombre')}»?`,
      `Si te equivocas, Rumbo guarda copias automáticas en mis_datos/copias.${extra}`, 'Borrar');
    if (!ok) return;
    setGuardando(true);
    try {
      await cliente.borrar('productos', id);
      router.dismissTo(INICIO);
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
      setGuardando(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: nuevo ? 'Nuevo producto' : 'Editar producto' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
          {bloqueado && (
            <Text style={[estilos.aviso, { color: c.aviso, borderColor: c.aviso }]}>
              {modo === 'demo' ? 'Estás viendo la cartera de ejemplo: para guardar, pulsa «Empezar con mis datos» en el panel.'
                : 'Estás viendo «Todos juntos», que solo sirve para mirar: elige un perfil.'}
            </Text>
          )}

          {!saldo && (
            <View style={[estilos.caja, { backgroundColor: c.sup, borderColor: c.borde }]}>
              <Text style={[estilos.titulo, { color: c.tinta }]}>Busca tu producto</Text>
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Por ISIN, ticker o nombre. Solo salen los que tienen precio.</Text>
              <Campo
                etiqueta="" value={q} onChangeText={setQ} placeholder="IE00BYX5NX33, AAPL, bitcoin, oro…"
                autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={buscar}
                derecha={<Pressable onPress={buscar} style={[estilos.mini, { backgroundColor: c.acento }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Buscar</Text></Pressable>}
              />
              {buscando && <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Buscando y comprobando precios…</Text>}
              {avisoBusqueda && <Text style={{ color: c.mal }}>{avisoBusqueda}</Text>}
              {resultados?.map((r, i) => (
                <Pressable
                  key={`${r.fuente}-${r.codigo}`} onPress={() => elegir(i)}
                  style={[estilos.resultado, { borderColor: elegido === i ? c.acento : c.borde, backgroundColor: elegido === i ? c.sup2 : 'transparent' }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={2}>{r.nombre || r.codigo}</Text>
                    <Text style={[estilos.pequeno, { color: c.tinta3 }]} numberOfLines={1}>
                      {[r.codigo, r.mercado, fuentes[r.fuente] ?? r.fuente].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {r.precio != null && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: c.tinta, fontVariant: ['tabular-nums'] }}>
                        {r.precio.toLocaleString('es-ES', { maximumFractionDigits: 4 })} {r.moneda}
                      </Text>
                      {r.fecha && <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{fmtFecha(r.fecha)}</Text>}
                    </View>
                  )}
                </Pressable>
              ))}
              {elegido != null && <Text style={[estilos.pequeno, { color: c.bien }]}>✓ Datos rellenados abajo: revísalos y guarda.</Text>}
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
                ¿No aparece o no tiene precio en internet (un piso, oro físico, un plan)? Rellénalo abajo y elige
                «Valor anotado a mano» como fuente.
              </Text>
            </View>
          )}

          <Text style={[estilos.titulo, { color: c.tinta }]}>El producto</Text>
          <Campo etiqueta="Nombre" value={texto('nombre')} onChangeText={(v) => pon('nombre', v)} />
          <Campo etiqueta="Nombre corto" value={texto('corto')} onChangeText={(v) => pon('corto', v)} maxLength={24} ayuda="Para los gráficos." />
          <Seccion titulo="Tipo">
            <Chips opciones={Object.entries(tipos).map(([k, v]) => ({ id: k, et: v }))} activo={tipo} alCambiar={(v) => pon('tipo', v)} />
          </Seccion>
          <Campo etiqueta="ISIN o ticker" value={texto('identificador')} onChangeText={(v) => pon('identificador', v)} placeholder="Opcional" autoCapitalize="characters" />
          <Campo etiqueta="Banco o bróker" value={texto('entidad')} onChangeText={(v) => pon('entidad', v)} placeholder="Opcional" />

          {!saldo && (
            <>
              <Text style={[estilos.titulo, { color: c.tinta }]}>De dónde sale el precio</Text>
              <Chips opciones={Object.entries(fuentes).map(([k, v]) => ({ id: k as Fuente, et: v }))} activo={f.fuente as Fuente} alCambiar={(v) => pon('fuente', v)} />
              {online && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 2 }}>
                    <Campo etiqueta="Código" value={texto('codigo')} onChangeText={(v) => pon('codigo', v)} autoCapitalize="none" autoCorrect={false} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Campo etiqueta="Moneda" value={texto('moneda')} onChangeText={(v) => pon('moneda', v)} maxLength={3} autoCapitalize="characters" />
                  </View>
                </View>
              )}
            </>
          )}

          <Text style={[estilos.titulo, { color: c.tinta }]}>Cómo se muestra</Text>
          <Campo etiqueta="Clase de activo" value={texto('clase')} onChangeText={(v) => pon('clase', v)} placeholder="Renta variable global" />
          {clases.length > 0 && (
            <Chips opciones={clases.map((x) => ({ id: x, et: x }))} activo={texto('clase') || null} alCambiar={(v) => pon('clase', v)} />
          )}
          <Seccion titulo="Color en los gráficos">
            <View style={estilos.colores}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                <Pressable
                  key={s} onPress={() => pon('slot', s)} accessibilityLabel={`Color ${s}`}
                  style={[estilos.color, { backgroundColor: colorSlot(s, c), borderColor: f.slot === s ? c.tinta : 'transparent' }]}
                />
              ))}
            </View>
          </Seccion>
          <Interruptor
            titulo="Inversión a largo plazo" valor={Boolean(f.largoPlazo)} alCambiar={(v) => pon('largoPlazo', v)}
            ayuda="Lo que no lo es (colchón, cuentas…) se puede quitar del panel con «Solo largo plazo» en la web."
          />
          <Interruptor
            titulo="Cuenta como liquidez" valor={liquidez}
            alCambiar={(v) => { setLiquidezTocada(true); pon('liquidez', v); }}
            ayuda="Dinero que puedes tener en el banco en unos días (cuentas, monetarios…)."
          />

          <Pressable onPress={() => setVerAvanzado((x) => !x)}>
            <Text style={{ color: c.acento }}>{verAvanzado ? 'Ocultar la ficha' : 'Ficha: comisión, riesgo, gestora y descripción'}</Text>
          </Pressable>
          {verAvanzado && (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Comisión anual (TER, %)" value={texto('ter')} onChangeText={(v) => pon('ter', v)} placeholder="0,12" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Riesgo (1 a 7)" value={texto('riesgo')} onChangeText={(v) => pon('riesgo', v)} keyboardType="number-pad" maxLength={1} />
                </View>
              </View>
              <Campo etiqueta="Gestora" value={texto('gestora')} onChangeText={(v) => pon('gestora', v)} />
              <Campo etiqueta="Descripción" value={texto('papel')} onChangeText={(v) => pon('papel', v)} placeholder="Para qué tienes este producto" multiline />
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
                El respaldo, el precio en vivo y «reparto como el de» se cambian en el panel web; aquí se conservan.
              </Text>
            </>
          )}

          {errores.length > 0 && (
            <View style={[estilos.errores, { borderColor: c.mal }]}>
              {errores.map((e, i) => <Text key={i} style={{ color: c.mal }}>{e}</Text>)}
            </View>
          )}
          <Boton texto={nuevo ? 'Guardar producto' : 'Guardar cambios'} alPulsar={guardar} ocupado={guardando} desactivado={bloqueado} />
          {online && nuevo && (
            <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Al guardar, Rumbo comprueba que el código tiene precio.</Text>
          )}
          {!nuevo && <Boton texto="Borrar producto" tipo="peligro" alPulsar={borrar} desactivado={guardando || bloqueado} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const c = useColores();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.tinta2, fontSize: 13, fontWeight: '600' }}>{titulo}</Text>
      {children}
    </View>
  );
}

function Interruptor({ titulo, ayuda, valor, alCambiar }: { titulo: string; ayuda: string; valor: boolean; alCambiar: (v: boolean) => void }) {
  const c = useColores();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontWeight: '600' }}>{titulo}</Text>
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{ayuda}</Text>
      </View>
      <Switch value={valor} onValueChange={alCambiar} trackColor={{ true: c.acento, false: c.sup3 }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pagina: { padding: 16, gap: 14, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  caja: { borderWidth: 1, borderRadius: RADIO, padding: 14, gap: 10 },
  titulo: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  aviso: { borderWidth: 1, borderRadius: RADIO, padding: 12, fontSize: 14 },
  errores: { borderWidth: 1, borderRadius: RADIO, padding: 12, gap: 4 },
  mini: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  resultado: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 10 },
  colores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  color: { width: 34, height: 34, borderRadius: 10, borderWidth: 3 },
});

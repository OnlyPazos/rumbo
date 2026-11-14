/**
 * Anotar (o editar) un movimiento o un saldo, como el editor del panel original de Rumbo
 * (app/web/editor.js). La validación la hace el backend (app/almacen.py): aquí se manda lo
 * escrito tal cual (acepta «1.234,56») y se enseñan sus mensajes.
 *
 * Parámetros: ?producto=<id> (preelegido), ?tipo=<tipo>, ?mov=<id> o ?val=<id> (editar).
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorRumbo } from '@/api/cliente';
import type { Cartera, Modo, Producto } from '@/api/tipos';
import { Boton, Campo, Chips, confirmar } from '@/componentes/Formulario';
import { fechaDesdeTexto, fmtEuros, fmtFecha, hoyISO, numEs } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { RADIO, useColores } from '@/tema';

type Tipo = 'compra' | 'venta' | 'dividendo' | 'comision' | 'traspaso' | 'saldo' | 'ajuste';

const TIPOS: { id: Tipo; et: string }[] = [
  { id: 'compra', et: 'Compra' }, { id: 'venta', et: 'Venta' }, { id: 'dividendo', et: 'Dividendo / interés' },
  { id: 'comision', et: 'Comisión' }, { id: 'traspaso', et: 'Traspaso' }, { id: 'saldo', et: 'Saldo / valor' },
  { id: 'ajuste', et: 'Cuadrar participaciones' },
];

/** Cuentas y deudas se siguen solo con saldos (SOLO_SALDO en app/almacen.py). */
const soloSaldo = (p: Producto) => p.tipo === 'efectivo' || p.tipo === 'deuda';
const cotiza = (p: Producto | undefined) => Boolean(p && p.fuente !== 'manual');

/** Qué productos admite cada tipo (lo mismo que comprueba guarda_movimiento / guarda_traspaso). */
function admite(tipo: Tipo, p: Producto) {
  if (tipo === 'saldo') return true;
  if (tipo === 'dividendo') return p.tipo !== 'deuda';
  // Ajuste: solo lo que tiene participaciones (cotiza y no es una cuenta), como guarda_ajuste.
  if (tipo === 'ajuste') return cotiza(p) && !soloSaldo(p);
  return !soloSaldo(p);
}

/** Unidades para escribirlas en un campo: con coma decimal y sin separar miles (así no hay dudas). */
const unidadesTexto = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 8, useGrouping: false });

export default function Anotar() {
  const c = useColores();
  const { cliente } = useSesion();
  const param = useLocalSearchParams<{ producto?: string; tipo?: Tipo; mov?: string; val?: string }>();

  const [cartera, setCartera] = useState<Cartera | null>(null);
  const [modo, setModo] = useState<Modo>('propio');
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [tipo, setTipo] = useState<Tipo>(param.tipo ?? 'compra');
  const [producto, setProducto] = useState<string | null>(param.producto ?? null);
  const [destino, setDestino] = useState<string | null>(null);
  const [fecha, setFecha] = useState(fmtFecha(hoyISO()));
  const [importe, setImporte] = useState('');
  const [unidades, setUnidades] = useState('');
  const [unidadesDestino, setUnidadesDestino] = useState('');
  const [comision, setComision] = useState('');
  const [aportado, setAportado] = useState('');
  const [moneda, setMoneda] = useState('EUR');
  const [nota, setNota] = useState('');
  const [verMas, setVerMas] = useState(false);
  /** Ajuste: las participaciones que calcula Rumbo ese día, para compararlas con las del banco. */
  const [calculadas, setCalculadas] = useState<number | null>(null);

  const editando = param.mov ?? param.val ?? null;

  // Carga la cartera y, si se edita, rellena el formulario con lo guardado.
  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.cartera().then(
      (r) => {
        if (!vigente) return;
        setCartera(r.cartera);
        setModo(r.modo);
        const m = param.mov ? r.cartera.movimientos.find((x) => x.id === param.mov) : null;
        const v = param.val ? r.cartera.valoraciones.find((x) => x.id === param.val) : null;
        if (m) {
          setTipo(m.tipo as Tipo);
          setProducto(m.producto);
          setFecha(fmtFecha(m.fecha));
          setImporte(m.importe != null ? unidadesTexto(m.importe) : '');
          setUnidades(m.unidades ? unidadesTexto(m.unidades) : '');
          setComision(m.comision ? unidadesTexto(m.comision) : '');
          setNota(m.nota ?? '');
          setDestino(m.destino ?? null);
          setUnidadesDestino(m.unidadesDestino ? unidadesTexto(m.unidadesDestino) : '');
        } else if (v) {
          setTipo('saldo');
          setProducto(v.producto);
          setFecha(fmtFecha(v.fecha));
          setImporte(unidadesTexto(v.valor));
          setAportado(v.aportado != null ? unidadesTexto(v.aportado) : '');
        }
      },
      (e) => vigente && setErrores([e instanceof ErrorRumbo ? e.message : String(e)]),
    );
    return () => {
      vigente = false;
    };
  }, [cliente, param.mov, param.val]);

  if (!cliente) return null;
  if (!cartera) {
    return (
      <View style={[estilos.centro, { backgroundColor: c.plano }]}>
        {errores.length ? <Text style={{ color: c.mal, padding: 20 }}>{errores[0]}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  const productos = cartera.productos.filter((p) => admite(tipo, p));
  const p = cartera.productos.find((x) => x.id === producto);
  const productoValido = p && admite(tipo, p) ? p : undefined;
  const nombre = (x: Producto) => x.corto || x.nombre;
  const opcionesProducto = productos.map((x) => ({ id: x.id, et: nombre(x) }));
  const bloqueado = modo !== 'propio';

  const fechaISO = fechaDesdeTexto(fecha);
  const nImporte = numEs(importe);
  const nUnidades = numEs(unidades);
  const precio = nImporte && nUnidades ? nImporte / nUnidades : null;

  async function todas() {
    if (!cliente || !productoValido || !fechaISO) {
      setErrores(['Elige antes el producto y la fecha.']);
      return;
    }
    try {
      const r = await cliente.unidades(productoValido.id, fechaISO, param.mov);
      setUnidades(unidadesTexto(r.unidades));
    } catch (e) {
      setErrores([e instanceof ErrorRumbo ? e.message : String(e)]);
    }
  }

  async function verCalculadas() {
    if (!cliente || !productoValido || !fechaISO) {
      setErrores(['Elige antes el producto y la fecha.']);
      return;
    }
    try {
      setCalculadas((await cliente.unidades(productoValido.id, fechaISO, param.mov)).unidades);
    } catch (e) {
      setErrores([e instanceof ErrorRumbo ? e.message : String(e)]);
    }
  }

  async function guardar() {
    if (!cliente) return;
    const faltan: string[] = [];
    if (!productoValido) faltan.push(tipo === 'traspaso' ? 'Elige de qué producto sale el dinero.' : 'Elige el producto.');
    if (!fechaISO) faltan.push('La fecha no es válida: escríbela como 13/09/2026.');
    if (faltan.length) {
      setErrores(faltan);
      return;
    }
    setErrores([]);
    setGuardando(true);
    try {
      if (tipo === 'saldo') {
        await cliente.guardarValoracion({ id: param.val, producto: productoValido!.id, fecha: fechaISO!, valor: importe, aportado });
      } else if (tipo === 'ajuste') {
        await cliente.guardarMovimiento({ id: param.mov, tipo, producto: productoValido!.id, fecha: fechaISO!, unidades, nota });
      } else {
        await cliente.guardarMovimiento({
          id: param.mov, tipo, producto: productoValido!.id, fecha: fechaISO!,
          importe, unidades, comision, nota,
          ...(tipo === 'traspaso' ? { destino: destino ?? undefined, unidadesDestino } : {}),
          ...(moneda.trim() && moneda.trim().toUpperCase() !== 'EUR' ? { moneda: moneda.trim().toUpperCase() } : {}),
        });
      }
      router.back();
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!cliente || !editando) return;
    const ok = await confirmar('Borrar', tipo === 'saldo' ? '¿Borrar este saldo anotado?' : '¿Borrar este movimiento?', 'Borrar');
    if (!ok) return;
    setGuardando(true);
    try {
      await cliente.borrar(tipo === 'saldo' ? 'valoraciones' : 'movimientos', editando);
      router.back();
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
    } finally {
      setGuardando(false);
    }
  }

  const etImporte = tipo === 'saldo' ? (p?.tipo === 'deuda' ? 'Lo que debes' : 'Saldo o valor') :
    tipo === 'compra' ? 'Importe pagado (€)' : tipo === 'venta' ? 'Importe recibido (€)' :
    tipo === 'traspaso' ? 'Importe traspasado (€)' : 'Importe (€)';

  return (
    <>
      <Stack.Screen options={{ title: editando ? 'Editar' : 'Anotar' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
          {bloqueado && (
            <Text style={[estilos.aviso, { color: c.aviso, borderColor: c.aviso }]}>
              {modo === 'demo'
                ? 'Estás viendo la cartera de ejemplo: para guardar, pulsa «Empezar con mis datos» en el panel.'
                : 'Estás viendo «Todos juntos», que solo sirve para mirar: elige un perfil para anotar.'}
            </Text>
          )}

          {!editando && <Chips opciones={TIPOS} activo={tipo} alCambiar={(t) => { setTipo(t); setErrores([]); }} />}
          {!editando && tipo === 'compra' && (
            <Pressable onPress={() => router.replace({ pathname: '/periodica', params: productoValido ? { producto: productoValido.id } : {} })}>
              <Text style={{ color: c.acento }}>↻ ¿Aportas lo mismo cada mes? Prepara todas de una vez</Text>
            </Pressable>
          )}

          <Seccion titulo={tipo === 'traspaso' ? 'Sale de' : 'Producto'}>
            {opcionesProducto.length ? (
              <Chips opciones={opcionesProducto} activo={productoValido?.id ?? null} alCambiar={setProducto} />
            ) : (
              <Text style={{ color: c.tinta3 }}>
                {tipo === 'saldo' ? 'Aún no tienes productos.'
                  : tipo === 'ajuste' ? 'Solo se cuadran los productos con precio en internet (fondos, ETF, acciones…).'
                  : 'No tienes productos de este tipo. Las cuentas y deudas se anotan con «Saldo / valor».'}
              </Text>
            )}
          </Seccion>

          {tipo === 'traspaso' && (
            <Seccion titulo="Va a">
              <Chips
                opciones={opcionesProducto.filter((o) => o.id !== productoValido?.id)}
                activo={destino} alCambiar={setDestino}
              />
            </Seccion>
          )}

          <Campo
            etiqueta="Fecha" value={fecha} onChangeText={setFecha} placeholder="13/09/2026"
            keyboardType="numbers-and-punctuation" autoCorrect={false}
            ayuda={fecha && !fechaISO ? 'Escríbela como 13/09/2026.' : undefined}
            derecha={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Mini texto="Hoy" alPulsar={() => setFecha(fmtFecha(hoyISO()))} />
                <Mini texto="Ayer" alPulsar={() => setFecha(fmtFecha(hoyISO(1)))} />
              </View>
            }
          />

          {tipo === 'ajuste' ? (
            <>
              <Text style={[estilos.pista, { color: c.tinta2 }]}>
                Si las participaciones que calcula Rumbo no coinciden con las de tu banco (por ejemplo, tras importar traspasos),
                anota aquí las del banco: desde esa fecha el producto tendrá exactamente esas, sin tocar lo que pagaste.
              </Text>
              <Campo
                etiqueta="Participaciones según tu banco" value={unidades} onChangeText={setUnidades} placeholder="0,000000"
                keyboardType="decimal-pad" derecha={<Mini texto="¿Y Rumbo?" alPulsar={verCalculadas} />}
                ayuda={calculadas != null ? `Ese día Rumbo calcula ${calculadas.toLocaleString('es-ES', { maximumFractionDigits: 6 })}.` : undefined}
              />
            </>
          ) : (
            <Campo etiqueta={etImporte} value={importe} onChangeText={setImporte} placeholder="0,00" keyboardType="decimal-pad" />
          )}

          {(tipo === 'compra' || tipo === 'venta' || tipo === 'traspaso') && (
            <Campo
              etiqueta={tipo === 'traspaso' ? 'Participaciones que salen' : 'Unidades o participaciones'}
              value={unidades} onChangeText={setUnidades} placeholder={cotiza(productoValido) ? '0,000000' : 'Opcional'}
              keyboardType="decimal-pad"
              ayuda={precio ? `Precio: ${fmtEuros(precio, true)} por unidad` : undefined}
              derecha={tipo !== 'compra' ? <Mini texto="Todas" alPulsar={todas} /> : undefined}
            />
          )}

          {tipo === 'traspaso' && (
            <Campo etiqueta="Participaciones que entran" value={unidadesDestino} onChangeText={setUnidadesDestino}
              placeholder="0,000000" keyboardType="decimal-pad" />
          )}

          {tipo === 'saldo' && productoValido && !soloSaldo(productoValido) && (
            <Campo etiqueta="Lo aportado hasta esa fecha (€)" value={aportado} onChangeText={setAportado}
              placeholder="Opcional" keyboardType="decimal-pad"
              ayuda="Con lo aportado, Rumbo calcula cuánto has ganado con este producto." />
          )}

          {(tipo === 'compra' || tipo === 'venta') && (
            <Campo etiqueta="Comisión (€)" value={comision} onChangeText={setComision} placeholder="Opcional" keyboardType="decimal-pad" />
          )}

          {tipo !== 'saldo' && (
            <>
              <Campo etiqueta="Nota" value={nota} onChangeText={setNota} placeholder="Opcional" />
              {tipo !== 'traspaso' && tipo !== 'ajuste' && (
                <Pressable onPress={() => setVerMas((x) => !x)}>
                  <Text style={{ color: c.acento, fontSize: 14 }}>{verMas ? 'Ocultar moneda' : '¿Pagaste en otra moneda?'}</Text>
                </Pressable>
              )}
              {verMas && tipo !== 'traspaso' && (
                <Campo etiqueta="Moneda del importe" value={moneda} onChangeText={setMoneda} autoCapitalize="characters" maxLength={3}
                  ayuda="Rumbo lo pasa a euros con el cambio de ese día y apunta en la nota lo que pagaste." />
              )}
            </>
          )}

          {p && productoValido && tipo !== 'saldo' && p.fuente === 'manual' && (
            <Text style={[estilos.pista, { color: c.tinta3 }]}>
              {nombre(p)} se valora a mano: además de los movimientos, anota su valor de vez en cuando con «Saldo / valor».
            </Text>
          )}

          {errores.length > 0 && (
            <View style={[estilos.errores, { borderColor: c.mal }]}>
              {errores.map((e, i) => <Text key={i} style={{ color: c.mal }}>{e}</Text>)}
            </View>
          )}

          <Boton texto={editando ? 'Guardar cambios' : 'Guardar'} alPulsar={guardar} ocupado={guardando} desactivado={bloqueado} />
          {editando && <Boton texto="Borrar" tipo="peligro" alPulsar={borrar} desactivado={guardando || bloqueado} />}
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

function Mini({ texto, alPulsar }: { texto: string; alPulsar: () => void }) {
  const c = useColores();
  return (
    <Pressable onPress={alPulsar} style={[estilos.mini, { backgroundColor: c.sup3 }]}>
      <Text style={{ color: c.tinta, fontWeight: '600', fontSize: 13 }}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pagina: { padding: 16, gap: 16, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  aviso: { borderWidth: 1, borderRadius: RADIO, padding: 12, fontSize: 14 },
  pista: { fontSize: 12, lineHeight: 17 },
  errores: { borderWidth: 1, borderRadius: RADIO, padding: 12, gap: 4 },
  mini: { paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10 },
});

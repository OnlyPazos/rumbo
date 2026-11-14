/**
 * Importar de golpe, como en el panel original de Rumbo (app/importar.py):
 * los CSV de MyInvestor, una plantilla en Excel o CSV, o el texto que te dé una IA.
 * Primero se ve una vista previa (no se guarda nada); en los traspasos de MyInvestor, Rumbo
 * pregunta de qué fondo venían; y al confirmar, se guarda (con copia automática antes).
 */
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ErrorRumbo, type ArchivoSubida } from '@/api/cliente';
import type { InformeImportacion, RespuestaTraspaso, TraspasoMyInvestor } from '@/api/tipos';
import { Boton, Campo, Chips } from '@/componentes/Formulario';
import { fechaDesdeTexto, fmtEuros, fmtFecha } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { usePanel } from '@/sesion/panel';
import { RADIO, useColores, type Colores } from '@/tema';

type Origen = 'myinvestor' | 'tabla' | 'ia';
const ORIGENES: { id: Origen; et: string }[] = [
  { id: 'myinvestor', et: 'MyInvestor' }, { id: 'tabla', et: 'Excel o CSV' }, { id: 'ia', et: 'Texto de una IA' },
];
const AYUDA: Record<Origen, string> = {
  myinvestor: 'En MyInvestor, descarga el CSV de cada fondo (Plusvalías y minusvalías) y elígelos todos a la vez.',
  tabla: 'La plantilla de Rumbo (se descarga desde el panel web) o tu propio Excel/CSV con fecha, producto, tipo e importe.',
  ia: 'Pide a una IA que pase tus movimientos a tabla con el texto de Rumbo y pega aquí lo que te conteste.',
};

/** Lo que se escribe para cada traspaso: el fondo de origen y la fecha (o «estimar»). */
type Borrador = { origen: string | null; fecha: string; estimar: boolean };

export default function Importar() {
  const c = useColores();
  const { cliente } = useSesion();
  const { cargar } = usePanel();
  const [origen, setOrigen] = useState<Origen>('myinvestor');
  const [archivos, setArchivos] = useState<ArchivoSubida[]>([]);
  const [texto, setTexto] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [informe, setInforme] = useState<InformeImportacion | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [errores, setErrores] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const nombres = archivos.map((a) => ('name' in a ? a.name : ''));

  async function elegirArchivos() {
    const r = await DocumentPicker.getDocumentAsync({ multiple: origen === 'myinvestor', copyToCacheDirectory: true, type: '*/*' });
    if (r.canceled) return;
    // En web vale el File del navegador; en el móvil, la uri con su nombre y tipo.
    setArchivos(r.assets.map((a) => a.file ?? { uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' }));
    reiniciaVista();
  }

  function reiniciaVista() {
    setToken(null);
    setInforme(null);
    setErrores([]);
    setHecho(null);
  }

  async function compartirPrompt() {
    if (!cliente) return;
    try {
      const r = await cliente.promptIA();
      await Share.share({ message: r.texto });
    } catch (e) {
      setErrores([e instanceof ErrorRumbo ? e.message : String(e)]);
    }
  }

  /** Respuestas válidas a los traspasos (las que tienen fondo y fecha). */
  function respuestas(): Record<string, RespuestaTraspaso> {
    const out: Record<string, RespuestaTraspaso> = {};
    for (const [ref, b] of Object.entries(borradores)) {
      // «No es un traspaso»: Rumbo importa sus lotes como compras normales (respuesta_valida lo trata así).
      if (b.origen === 'ninguno') {
        out[ref] = { origen: 'ninguno', fecha: 'estimar' };
        continue;
      }
      const fecha = b.estimar ? 'estimar' : fechaDesdeTexto(b.fecha);
      if (b.origen && fecha) out[ref] = { origen: b.origen, fecha };
    }
    return out;
  }

  /** Rellena los borradores con lo que propone Rumbo (si ya se contestó en otra importación). */
  function borradoresDe(inf: InformeImportacion) {
    const nuevos: Record<string, Borrador> = {};
    for (const t of inf.traspasosMyInvestor) {
      const s = t.respuesta ?? t.sugerencia;
      nuevos[t.ref] = borradores[t.ref] ?? {
        origen: s?.origen ?? null,
        fecha: s?.fecha && s.fecha !== 'estimar' ? fmtFecha(s.fecha) : '',
        estimar: s?.fecha === 'estimar',
      };
    }
    return nuevos;
  }

  async function revisar() {
    if (!cliente) return;
    setErrores([]);
    setHecho(null);
    setOcupado('Leyendo y comprobando precios…');
    try {
      const r = token
        ? await cliente.revisarImportacion(token, respuestas())
        : await cliente.previsualizarImportacion(origen === 'myinvestor' ? 'myinvestor' : 'tabla', origen === 'ia' ? { texto } : { archivos });
      setToken(r.token);
      setInforme(r.informe);
      setBorradores(borradoresDe(r.informe));
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
    } finally {
      setOcupado(null);
    }
  }

  async function confirmar() {
    if (!cliente || !token) return;
    setOcupado('Importando…');
    setErrores([]);
    try {
      const r = await cliente.confirmarImportacion(token, respuestas());
      const i = r.informe;
      setHecho(`Hecho: ${i.añadidos} movimientos añadidos${i.saldos ? `, ${i.saldos} saldos` : ''}${i.traspasos ? `, ${i.traspasos} traspasos` : ''}` +
        `${i.repetidos ? ` (${i.repetidos} ya estaban y no se han repetido)` : ''}.`);
      setToken(null);
      setInforme(null);
      setArchivos([]);
      setTexto('');
      await cargar();
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
    } finally {
      setOcupado(null);
    }
  }

  const listo = origen === 'ia' ? texto.trim().length > 0 : archivos.length > 0;
  const pendientes = informe?.traspasosMyInvestor.filter((t) => !respuestas()[t.ref]).length ?? 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Importar' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
          <Chips opciones={ORIGENES} activo={origen} alCambiar={(o) => { setOrigen(o); setArchivos([]); reiniciaVista(); }} />
          <Text style={[estilos.pequeno, { color: c.tinta2 }]}>{AYUDA[origen]}</Text>

          {origen === 'ia' ? (
            <>
              <Boton texto="Compartir el texto para la IA" tipo="secundario" alPulsar={compartirPrompt} />
              <Campo
                etiqueta="Lo que te ha contestado la IA" value={texto} onChangeText={(v) => { setTexto(v); reiniciaVista(); }}
                multiline placeholder="fecha;producto;tipo;importe…" style={{ minHeight: 140, textAlignVertical: 'top' }}
              />
            </>
          ) : (
            <>
              <Boton texto={archivos.length ? 'Elegir otros archivos' : 'Elegir archivos'} tipo="secundario" alPulsar={elegirArchivos} />
              {nombres.map((n, i) => <Text key={i} style={[estilos.pequeno, { color: c.tinta2 }]}>📄 {n}</Text>)}
            </>
          )}

          <Boton texto={token ? 'Volver a revisar' : 'Revisar (no guarda nada)'} alPulsar={revisar} desactivado={!listo || Boolean(ocupado)} />
          {ocupado && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator /><Text style={{ color: c.tinta3 }}>{ocupado}</Text>
            </View>
          )}
          {errores.map((e, i) => <Text key={i} style={{ color: c.mal }}>{e}</Text>)}
          {hecho && <Text style={{ color: c.bien, fontWeight: '700' }}>{hecho}</Text>}

          {informe && (
            <VistaPrevia
              informe={informe} c={c} borradores={borradores}
              alCambiar={(ref, b) => setBorradores((x) => ({ ...x, [ref]: b }))}
            />
          )}

          {informe && (
            <>
              {pendientes > 0 && (
                <Text style={[estilos.pequeno, { color: c.aviso }]}>
                  Quedan {pendientes} traspasos sin contestar: si importas así, sus lotes entran como compras. Contéstalos y pulsa
                  «Volver a revisar» para verlo antes.
                </Text>
              )}
              <Boton texto="Importar" alPulsar={confirmar} desactivado={Boolean(ocupado) || informe.añadidos + informe.saldos === 0} />
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Antes de guardar, Rumbo hace una copia automática de tu cartera.</Text>
            </>
          )}
          {hecho && <Boton texto="Ver el panel" tipo="secundario" alPulsar={() => router.back()} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function VistaPrevia({ informe, c, borradores, alCambiar }: {
  informe: InformeImportacion; c: Colores; borradores: Record<string, Borrador>; alCambiar: (ref: string, b: Borrador) => void;
}) {
  const t = informe.totales;
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <Text style={{ color: c.tinta, fontWeight: '700', fontSize: 16 }}>Vista previa</Text>
      <Text style={{ color: c.tinta2 }}>
        {informe.añadidos} movimientos nuevos{informe.saldos ? ` y ${informe.saldos} saldos` : ''}
        {informe.repetidos ? ` · ${informe.repetidos} ya estaban (no se repiten)` : ''}
        {informe.sustituidos ? ` · ${informe.sustituidos} se sustituyen` : ''}
      </Text>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        {[t.compras && `compras ${fmtEuros(t.compras)} (${t.numCompras})`, t.ventas && `ventas ${fmtEuros(t.ventas)}`,
          t.dividendos && `dividendos ${fmtEuros(t.dividendos)}`, t.comisiones && `comisiones ${fmtEuros(t.comisiones)}`].filter(Boolean).join(' · ')}
      </Text>

      {informe.productosNuevos.length > 0 && (
        <>
          <Text style={[estilos.subtitulo, { color: c.tinta }]}>Productos nuevos</Text>
          {informe.productosNuevos.map((p, i) => (
            <Text key={i} style={[estilos.pequeno, { color: c.tinta2 }]}>
              + {p.nombre}{p.precio != null ? ` · ${p.precio.toLocaleString('es-ES')} ${p.monedaPrecio ?? ''}` : ''}
            </Text>
          ))}
        </>
      )}

      {informe.traspasosMyInvestor.map((tr) => (
        <PreguntaTraspaso key={tr.ref} tr={tr} c={c} b={borradores[tr.ref]} alCambiar={(b) => alCambiar(tr.ref, b)} />
      ))}

      {informe.errores.length > 0 && (
        <>
          <Text style={[estilos.subtitulo, { color: c.mal }]}>No se pueden importar</Text>
          {informe.errores.map((e, i) => <Text key={i} style={[estilos.pequeno, { color: c.mal }]}>{String(e.fila)}: {e.mensaje}</Text>)}
        </>
      )}
      {informe.avisos.map((a, i) => <Text key={i} style={[estilos.pequeno, { color: c.aviso }]}>⚠ {a}</Text>)}

      {informe.filas.length > 0 && (
        <>
          <Text style={[estilos.subtitulo, { color: c.tinta }]}>Movimientos</Text>
          {informe.filas.slice(0, 40).map((f, i) => (
            <View key={i} style={[estilos.fila, { borderColor: c.borde }]}>
              <Text style={[estilos.pequeno, { color: c.tinta2, flex: 1 }]} numberOfLines={1}>
                {fmtFecha(f.fecha)} · {f.productoNombre} · {f.tipo}{f.marcas.length ? ` (${f.marcas.join(', ')})` : ''}
              </Text>
              <Text style={[estilos.pequeno, { color: f.estado === 'nuevo' ? c.tinta : c.tinta3 }]}>{fmtEuros(f.importe, true)}</Text>
            </View>
          ))}
          {informe.filas.length > 40 && <Text style={[estilos.pequeno, { color: c.tinta3 }]}>… y {informe.filas.length - 40} más.</Text>}
        </>
      )}
    </View>
  );
}

/** «¿De qué fondo venía este traspaso?» (MyInvestor no lo dice en el extracto). */
function PreguntaTraspaso({ tr, c, b, alCambiar }: { tr: TraspasoMyInvestor; c: Colores; b?: Borrador; alCambiar: (b: Borrador) => void }) {
  const actual: Borrador = b ?? { origen: null, fecha: '', estimar: false };
  const fechaMala = !actual.estimar && actual.fecha !== '' && !fechaDesdeTexto(actual.fecha);
  return (
    <View style={[estilos.pregunta, { borderColor: tr.hecho ? c.bien : c.aviso }]}>
      <Text style={{ color: c.tinta, fontWeight: '700' }}>Traspaso a {tr.nombre}</Text>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        {tr.lotes} {tr.lotes === 1 ? 'lote' : 'lotes'} · {fmtEuros(tr.coste, true)} de coste. ¿De qué fondo venía y cuándo se hizo?
      </Text>
      <Chips
        opciones={[...tr.origenes.map((o) => ({ id: o.id, et: o.nombre })), { id: 'ninguno', et: 'No es un traspaso' }]}
        activo={actual.origen} alCambiar={(o) => alCambiar({ ...actual, origen: o })}
      />
      {actual.origen && actual.origen !== 'ninguno' && (
        <>
          <Chips
            opciones={[{ id: 'fecha', et: 'Sé la fecha' }, { id: 'estimar', et: 'Que la estime Rumbo' }] as const}
            activo={actual.estimar ? 'estimar' : 'fecha'} alCambiar={(v) => alCambiar({ ...actual, estimar: v === 'estimar' })}
          />
          {!actual.estimar && (
            <Campo etiqueta="Fecha del traspaso" value={actual.fecha} onChangeText={(v) => alCambiar({ ...actual, fecha: v })}
              placeholder="13/09/2026" keyboardType="numbers-and-punctuation" ayuda={fechaMala ? 'Escríbela como 13/09/2026.' : undefined} />
          )}
        </>
      )}
      {tr.hecho && <Text style={[estilos.pequeno, { color: c.bien }]}>✓ Se importará como traspaso.</Text>}
      {tr.error && <Text style={[estilos.pequeno, { color: c.mal }]}>{tr.error}</Text>}
      {tr.aviso && <Text style={[estilos.pequeno, { color: c.aviso }]}>{tr.aviso}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 12, maxWidth: 680, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 14, gap: 8 },
  subtitulo: { fontWeight: '700', marginTop: 6 },
  fila: { flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth },
  pregunta: { borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 8 },
});

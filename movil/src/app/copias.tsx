/**
 * Copias de seguridad y Excel, como en el panel original de Rumbo: las copias automáticas que guarda
 * antes de cada cambio (recuperar una), descargar o subir una copia, exportar tus datos a Excel y la
 * plantilla para importar. Rumbo hace una copia de lo que hay antes de recuperar o subir otra.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ErrorRumbo } from '@/api/cliente';
import type { CopiaSeguridad, Modo } from '@/api/tipos';
import { compartirDescarga } from '@/compartir';
import { Boton, confirmar } from '@/componentes/Formulario';
import { fmtFecha, hoyISO } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { usePanel } from '@/sesion/panel';
import { RADIO, useColores } from '@/tema';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function Copias() {
  const c = useColores();
  const { cliente } = useSesion();
  const { cargar } = usePanel();
  const [copias, setCopias] = useState<CopiaSeguridad[] | null>(null);
  const [modo, setModo] = useState<Modo>('propio');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  const leer = useCallback(async () => {
    if (!cliente) return;
    const [lista, car] = await Promise.all([cliente.copias(), cliente.cartera()]);
    setCopias(lista.copias);
    setModo(car.modo);
  }, [cliente]);

  useFocusEffect(
    useCallback(() => {
      leer().catch((e) => setMensaje({ texto: e instanceof ErrorRumbo ? e.message : String(e), error: true }));
    }, [leer]),
  );

  /** Ejecuta una acción con su aviso de «trabajando» y su resultado. */
  async function hacer(que: string, accion: () => Promise<unknown>, hecho?: string) {
    setOcupado(que);
    setMensaje(null);
    try {
      await accion();
      if (hecho) setMensaje({ texto: hecho });
    } catch (e) {
      setMensaje({ texto: e instanceof ErrorRumbo ? e.message : e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setOcupado(null);
    }
  }

  async function recuperar(x: CopiaSeguridad) {
    const ok = await confirmar('Recuperar esta copia',
      `Tu cartera volverá a como estaba (${x.productos} productos, ${x.movimientos} movimientos). Antes, Rumbo guarda una copia de lo que tienes ahora.`,
      'Recuperar');
    if (!ok || !cliente) return;
    await hacer('recuperar', async () => {
      await cliente.recuperarCopia(x.archivo);
      await Promise.all([cargar(), leer()]);
    }, 'Copia recuperada.');
  }

  async function subir() {
    if (!cliente) return;
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0];
    const ok = await confirmar('Subir una copia', `Tu cartera pasará a ser la de «${a.name}». Antes, Rumbo guarda una copia de lo que tienes ahora.`, 'Subir');
    if (!ok) return;
    await hacer('subir', async () => {
      await cliente.subirCopia(a.file ?? { uri: a.uri, name: a.name, type: a.mimeType ?? 'application/json' });
      await Promise.all([cargar(), leer()]);
    }, 'Copia subida: tu cartera ya es la de ese archivo.');
  }

  const descargar = (que: string, ruta: string, nombre: string, mime: string) =>
    hacer(que, () => compartirDescarga(cliente!.peticionDescarga(ruta), nombre, mime));

  return (
    <>
      <Stack.Screen options={{ title: 'Copias y Excel' }} />
      <ScrollView contentContainerStyle={estilos.pagina}>
        {mensaje && <Text style={{ color: mensaje.error ? c.mal : c.bien, fontWeight: '600' }}>{mensaje.texto}</Text>}

        <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
          <Text style={[estilos.titulo, { color: c.tinta }]}>Tus datos en Excel</Text>
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Movimientos, saldos y productos. Se puede volver a importar.</Text>
          <Boton texto="Exportar a Excel" tipo="secundario" ocupado={ocupado === 'excel'}
            alPulsar={() => descargar('excel', '/api/exportar-excel', `rumbo_mis_datos_${hoyISO()}.xlsx`, XLSX)} />
          <Boton texto="Plantilla para importar (Excel)" tipo="secundario" ocupado={ocupado === 'plantilla'}
            alPulsar={() => descargar('plantilla', '/api/plantilla.xlsx', 'plantilla_patrimonio.xlsx', XLSX)} />
        </View>

        <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
          <Text style={[estilos.titulo, { color: c.tinta }]}>Copia de seguridad</Text>
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
            Un archivo con toda tu cartera: guárdalo fuera del servidor (en Archivos, en tu nube…) o súbelo en otro Rumbo al
            cambiar de equipo.
          </Text>
          <Boton texto="Descargar la copia de hoy" tipo="secundario" ocupado={ocupado === 'copia'} desactivado={modo !== 'propio'}
            alPulsar={() => descargar('copia', '/api/copia/descargar', `copia_patrimonio_${hoyISO()}.json`, 'application/json')} />
          <Boton texto="Subir una copia" tipo="secundario" ocupado={ocupado === 'subir'} desactivado={modo === 'todos'} alPulsar={subir} />
        </View>

        <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
          <Text style={[estilos.titulo, { color: c.tinta }]}>Copias automáticas</Text>
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Rumbo guarda una antes de cada cambio. Si te equivocas, vuelve a una.</Text>
          {!copias && <ActivityIndicator />}
          {copias?.length === 0 && <Text style={{ color: c.tinta3 }}>Aún no hay copias.</Text>}
          {copias?.slice(0, 30).map((x) => (
            <View key={x.archivo} style={[estilos.fila, { borderColor: c.borde }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.tinta }}>{fmtFecha(x.fecha)} · {x.fecha.slice(11, 16)}</Text>
                <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{x.motivo} · {x.productos} productos · {x.movimientos} movimientos</Text>
              </View>
              <Pressable onPress={() => recuperar(x)} disabled={Boolean(ocupado) || modo === 'todos'} hitSlop={6}>
                <Text style={{ color: c.acento, fontWeight: '600' }}>Recuperar</Text>
              </Pressable>
            </View>
          ))}
          {(copias?.length ?? 0) > 30 && <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Y {copias!.length - 30} más antiguas.</Text>}
        </View>
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 12, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 10 },
  titulo: { fontSize: 16, fontWeight: '700' },
  pequeno: { fontSize: 12, lineHeight: 17 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
});

/**
 * Más: perfiles, Renta, importar, conexión, versión y créditos.
 * Los perfiles son los del panel original de Rumbo (la cartera de tu pareja o de tus hijos, cada una aparte,
 * y «Todos juntos» para ver la suma).
 */
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ErrorRumbo } from '@/api/cliente';
import type { InfoPerfiles, Version } from '@/api/tipos';
import { AUTOR, PieCreditos } from '@/componentes/Creditos';
import { confirmar } from '@/componentes/Formulario';
import { useSesion } from '@/sesion/contexto';
import { usePanel } from '@/sesion/panel';
import { RADIO, useColores, type Colores } from '@/tema';

const TODOS = 'todos';

export default function Mas() {
  const c = useColores();
  const { cliente, conexion } = useSesion();
  const { cargar } = usePanel();
  const [perfiles, setPerfiles] = useState<InfoPerfiles | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [renombrando, setRenombrando] = useState<{ id: string; nombre: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!cliente) return;
      let vigente = true;
      cliente.perfiles().then((r) => vigente && setPerfiles(r), (e) => vigente && setError(e instanceof ErrorRumbo ? e.message : String(e)));
      cliente.version().then((v) => vigente && setVersion(v), () => undefined);
      return () => {
        vigente = false;
      };
    }, [cliente]),
  );

  /** Hace algo con los perfiles y lo vuelve a leer todo (también el panel, que cambia de perfil). */
  async function hacer(accion: () => Promise<unknown>) {
    if (!cliente) return;
    setOcupado(true);
    setError(null);
    try {
      await accion();
      setPerfiles(await cliente.perfiles());
      await cargar();   // el cliente aprende el perfil activo nuevo (cabecera X-Rumbo-Perfil)
    } catch (e) {
      setError(e instanceof ErrorRumbo ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(id: string, nombre: string) {
    const ok = await confirmar(`¿Borrar el perfil «${nombre}»?`, 'Su cartera no se pierde: se mueve a mis_datos/copias.', 'Borrar');
    if (ok) hacer(() => cliente!.borrarPerfil(id));
  }

  return (
    <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
      <Tarjeta c={c}>
        <Text style={[estilos.titulo, { color: c.tinta }]}>Perfiles</Text>
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
          La cartera de tu pareja o de tus hijos, cada una aparte. «Todos juntos» suma todas, solo para mirar.
        </Text>
        {!perfiles && !error && <ActivityIndicator />}
        {perfiles?.lista.map((p) => {
          const activo = perfiles.activo === p.id;
          return (
            <View key={p.id} style={[estilos.fila, { borderColor: c.borde }]}>
              {renombrando?.id === p.id ? (
                <>
                  <TextInput
                    value={renombrando.nombre} onChangeText={(v) => setRenombrando({ id: p.id, nombre: v })} autoFocus maxLength={40}
                    style={[estilos.campo, { color: c.tinta, backgroundColor: c.sup2, borderColor: c.borde }]}
                  />
                  <Accion c={c} texto="Guardar" alPulsar={() => { const r = renombrando; setRenombrando(null); hacer(() => cliente!.renombrarPerfil(r.id, r.nombre)); }} />
                  <Accion c={c} texto="Cancelar" tenue alPulsar={() => setRenombrando(null)} />
                </>
              ) : (
                <>
                  <Pressable style={{ flex: 1 }} disabled={activo || ocupado} onPress={() => hacer(() => cliente!.activarPerfil(p.id))}>
                    <Text style={{ color: c.tinta, fontWeight: activo ? '800' : '500' }}>{activo ? '● ' : '○ '}{p.nombre}</Text>
                    <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{activo ? 'Es el que ves ahora' : p.conDatos ? 'Toca para verlo' : 'Aún sin datos'}</Text>
                  </Pressable>
                  <Accion c={c} texto="Renombrar" tenue alPulsar={() => setRenombrando({ id: p.id, nombre: p.nombre })} />
                  {p.id !== 'principal' && <Accion c={c} texto="Borrar" peligro alPulsar={() => borrar(p.id, p.nombre)} />}
                </>
              )}
            </View>
          );
        })}
        {perfiles?.todos && (
          <Pressable
            disabled={perfiles.activo === TODOS || ocupado} onPress={() => hacer(() => cliente!.activarPerfil(TODOS))}
            style={[estilos.fila, { borderColor: c.borde }]}
          >
            <Text style={{ color: c.tinta, fontWeight: perfiles.activo === TODOS ? '800' : '500' }}>
              {perfiles.activo === TODOS ? '● ' : '○ '}Todos juntos
            </Text>
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={nuevo} onChangeText={setNuevo} placeholder="Nombre del perfil nuevo" placeholderTextColor={c.tinta3} maxLength={40}
            style={[estilos.campo, { color: c.tinta, backgroundColor: c.sup2, borderColor: c.borde }]}
          />
          <Accion c={c} texto="Crear" alPulsar={() => { const n = nuevo; setNuevo(''); hacer(() => cliente!.crearPerfil(n)); }} />
        </View>
        {ocupado && <ActivityIndicator />}
        {error && <Text style={{ color: c.mal }}>{error}</Text>}
      </Tarjeta>

      <Tarjeta c={c}>
        <Enlace c={c} href="/renta" titulo="Para la Renta" nota="Tus ventas del año (FIFO), dividendos e intereses." />
        <Enlace c={c} href="/importar" titulo="Importar" nota="De MyInvestor, de un Excel o CSV, o el texto que te dé una IA." />
      </Tarjeta>

      <Tarjeta c={c}>
        <Enlace c={c} href="/conectar" titulo="Conexión" nota={conexion?.servidor ?? ''} />
        {version && (
          <View style={{ gap: 2 }}>
            <Text style={{ color: c.tinta }}>Rumbo {version.actual}{version.docker ? ' (Docker)' : ''}</Text>
            {version.hayNueva && (
              <Text style={[estilos.pequeno, { color: c.aviso }]} onPress={() => Linking.openURL(version.repo)}>
                Hay una versión nueva de Rumbo ({version.ultima}) en el repositorio de {AUTOR}. Para traerla a tu servidor,
                actualiza tu copia con sus cambios.
              </Text>
            )}
          </View>
        )}
        <Enlace c={c} href="/acerca" titulo="Acerca de" nota={`Rumbo es una herramienta de ${AUTOR}.`} />
      </Tarjeta>
      <PieCreditos />
    </ScrollView>
  );
}

function Enlace({ c, href, titulo, nota }: { c: Colores; href: Href; titulo: string; nota: string }) {
  return (
    // Sin <Link asChild>: su <Slot> no admite un `style` en array en el hijo y la pantalla se cerraba.
    <Pressable onPress={() => router.push(href)} accessibilityRole="link" style={[estilos.enlace, { borderColor: c.borde }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontWeight: '600', fontSize: 16 }}>{titulo}</Text>
        {nota ? <Text style={[estilos.pequeno, { color: c.tinta3 }]} numberOfLines={2}>{nota}</Text> : null}
      </View>
      <Text style={{ color: c.tinta3, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

function Accion({ c, texto, alPulsar, tenue, peligro }: { c: Colores; texto: string; alPulsar: () => void; tenue?: boolean; peligro?: boolean }) {
  return (
    <Pressable onPress={alPulsar} style={[estilos.accion, { backgroundColor: tenue || peligro ? 'transparent' : c.acento }]}>
      <Text style={{ color: peligro ? c.mal : tenue ? c.tinta2 : '#fff', fontWeight: '600', fontSize: 13 }}>{texto}</Text>
    </Pressable>
  );
}

function Tarjeta({ c, children }: { c: Colores; children: React.ReactNode }) {
  return <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>{children}</View>;
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 10, maxWidth: 620, width: '100%', alignSelf: 'center' },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 10 },
  titulo: { fontSize: 16, fontWeight: '700' },
  pequeno: { fontSize: 12, lineHeight: 17 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  campo: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  accion: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
});

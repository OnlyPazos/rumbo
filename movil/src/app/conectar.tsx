import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ClienteRumbo, ErrorRumbo, leeDireccion } from '@/api/cliente';
import { PieCreditos } from '@/componentes/Creditos';
import { INICIO } from '@/navegacion/rutas';
import { useSesion } from '@/sesion/contexto';
import { RADIO, useColores } from '@/tema';

export default function Conectar() {
  const c = useColores();
  const { conexion, conectar } = useSesion();
  const [direccion, setDireccion] = useState(conexion?.servidor ?? '');
  const [llave, setLlave] = useState(conexion?.llave ?? '');
  const [error, setError] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);
  const { qr } = useLocalSearchParams<{ qr?: string }>();

  // Vuelta del escáner: se rellena la dirección y se conecta directamente.
  useEffect(() => {
    if (qr) probar(qr, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr]);

  async function probar(textoDireccion = direccion, textoLlave = llave) {
    setError(null);
    let servidor: string;
    let llaveFinal = textoLlave.trim();
    try {
      const leida = leeDireccion(textoDireccion);
      servidor = leida.servidor;
      llaveFinal = leida.llave ?? llaveFinal;
      // La llave nunca se queda a la vista en el campo de la dirección.
      setDireccion(servidor);
      setLlave(llaveFinal);
    } catch {
      setError('Esa dirección no es válida. Ejemplo: http://192.168.1.50:8765');
      return;
    }
    if (!llaveFinal) {
      setError('Falta la llave de acceso (o pega la dirección entera que imprime Rumbo, con ?acceso=…).');
      return;
    }
    setProbando(true);
    try {
      const cliente = new ClienteRumbo({ servidor, llave: llaveFinal }, 15_000);
      if (!(await cliente.esRumbo())) {
        setError(`No encuentro Rumbo en ${servidor}. ¿Está encendido y estás en la misma red (o en Tailscale)?`);
        return;
      }
      await cliente.perfiles();   // comprueba la llave
      await conectar({ servidor, llave: llaveFinal });
      router.replace(INICIO);
    } catch (e) {
      setError(e instanceof ErrorRumbo ? e.message : String(e));
    } finally {
      setProbando(false);
    }
  }

  const campo = [estilos.campo, { backgroundColor: c.sup2, color: c.tinta, borderColor: c.borde }];

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={[estilos.parrafo, { color: c.tinta2 }]}>
        Esta app se conecta a tu Rumbo (en Docker en un NAS o una Raspberry, o en tu ordenador). Tus datos se
        quedan allí: la app solo los muestra.
      </Text>

      <Pressable
        onPress={() => router.push('/escanear')}
        disabled={probando}
        style={[estilos.boton, { backgroundColor: c.acento, marginTop: 0, opacity: probando ? 0.6 : 1 }]}
      >
        {probando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBoton}>Escanear QR</Text>}
      </Pressable>
      <Text style={[estilos.ayuda, { color: c.tinta3 }]}>
        Rumbo enseña el QR en su ventana al arrancar abierto a la red, y en la página /movil desde el navegador del
        ordenador (por ejemplo, http://192.168.1.50:8765/movil).
      </Text>

      <Text style={[estilos.separador, { color: c.tinta3 }]}>o escríbelo a mano</Text>

      <Text style={[estilos.etiqueta, { color: c.tinta }]}>Dirección</Text>
      <TextInput
        style={campo}
        value={direccion}
        onChangeText={setDireccion}
        placeholder="http://192.168.1.50:8765"
        placeholderTextColor={c.tinta3}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={[estilos.ayuda, { color: c.tinta3 }]}>
        Puedes pegar aquí la dirección entera que imprime Rumbo al arrancar (con ?acceso=…) y no hace falta la llave.
      </Text>

      <Text style={[estilos.etiqueta, { color: c.tinta }]}>Llave de acceso</Text>
      <TextInput
        style={campo}
        value={llave}
        onChangeText={setLlave}
        placeholder="La de mis_datos/.acceso"
        placeholderTextColor={c.tinta3}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      {error && <Text style={[estilos.error, { color: c.mal }]}>{error}</Text>}

      <Pressable
        onPress={() => probar()}
        disabled={probando}
        style={[estilos.boton, { backgroundColor: c.sup3, opacity: probando ? 0.6 : 1 }]}
      >
        <Text style={[estilos.textoBoton, { color: c.tinta }]}>Conectar</Text>
      </Pressable>

      <View style={{ height: 16 }} />
      <Text style={[estilos.ayuda, { color: c.tinta3 }]}>
        No abras el puerto de Rumbo a internet: para entrar desde fuera de casa, usa una VPN como Tailscale.
      </Text>
      <PieCreditos />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 20, gap: 8, maxWidth: 560, width: '100%', alignSelf: 'center' },
  parrafo: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  etiqueta: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  ayuda: { fontSize: 12, lineHeight: 17 },
  campo: { borderWidth: 1, borderRadius: RADIO, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  error: { fontSize: 14, marginTop: 8 },
  separador: { fontSize: 13, textAlign: 'center', marginTop: 20, marginBottom: 4 },
  boton: { marginTop: 16, borderRadius: RADIO, paddingVertical: 14, alignItems: 'center' },
  textoBoton: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

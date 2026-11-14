/**
 * Escanea el QR que enseña Rumbo (en el terminal al arrancar, o en http://…:8765/movil)
 * y vuelve a «Conectar» con la dirección y la llave ya puestas.
 */
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { leeDireccion } from '@/api/cliente';
import { RADIO, useColores } from '@/tema';

export default function Escanear() {
  const c = useColores();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [aviso, setAviso] = useState<string | null>(null);
  const leido = useRef(false);   // la cámara avisa muchas veces por segundo: solo vale la primera buena

  function alLeer({ data }: BarcodeScanningResult) {
    if (leido.current) return;
    let llave: string | undefined;
    try {
      llave = leeDireccion(data).llave;
    } catch {
      llave = undefined;
    }
    if (!llave) {
      setAviso('Ese QR no es el de Rumbo. Usa el que sale al arrancarlo o en la página /movil.');
      return;
    }
    leido.current = true;
    router.replace({ pathname: '/conectar', params: { qr: data } });
  }

  if (!permiso) return <View style={[estilos.centro, { backgroundColor: c.plano }]}><ActivityIndicator /></View>;

  if (!permiso.granted) {
    return (
      <View style={[estilos.centro, { backgroundColor: c.plano, padding: 24, gap: 16 }]}>
        <Text style={{ color: c.tinta, fontSize: 16, textAlign: 'center' }}>
          Para escanear el QR de Rumbo, la app necesita usar la cámara.
        </Text>
        <Pressable
          onPress={() => (permiso.canAskAgain ? pedirPermiso() : Linking.openSettings())}
          style={[estilos.boton, { backgroundColor: c.acento }]}
        >
          <Text style={estilos.textoBoton}>{permiso.canAskAgain ? 'Permitir la cámara' : 'Abrir Ajustes'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={alLeer}
      />
      <View style={estilos.marco} pointerEvents="none" />
      <View style={estilos.pie}>
        <Text style={estilos.textoPie}>
          {aviso ?? 'Apunta al QR que enseña Rumbo al arrancar (o en la página /movil del ordenador).'}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boton: { borderRadius: RADIO, paddingVertical: 14, paddingHorizontal: 24 },
  textoBoton: { color: '#fff', fontWeight: '700', fontSize: 16 },
  marco: {
    position: 'absolute', alignSelf: 'center', top: '22%', width: 260, height: 260,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 24,
  },
  pie: { position: 'absolute', bottom: 48, left: 24, right: 24, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIO, padding: 14 },
  textoPie: { color: '#fff', textAlign: 'center', fontSize: 14 },
});

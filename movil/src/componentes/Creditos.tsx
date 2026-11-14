/**
 * Reconocimiento al autor original. Va en el pie de las pantallas principales y en «Acerca de».
 * Rumbo es obra de Dani Dominguez Quant (MIT): esta app solo le pone otra cara.
 */
import { Link } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColores } from '@/tema';

export const AUTOR = 'Dani Dominguez Quant';
export const REPO_ORIGINAL = 'https://github.com/danidm98/rumbo';
export const CANAL_AUTOR = 'https://www.youtube.com/channel/UCiS3qumDoE7QDwzo_ChU6yQ?sub_confirmation=1';

export function PieCreditos() {
  const c = useColores();
  return (
    <View style={estilos.pie}>
      <Text style={[estilos.texto, { color: c.tinta3 }]}>
        Basado en{' '}
        <Text style={{ color: c.tinta2, fontWeight: '600' }} onPress={() => Linking.openURL(REPO_ORIGINAL)}>
          Rumbo
        </Text>
        , de {AUTOR}.{' '}
        <Link href="/acerca" style={{ color: c.acento }}>
          Créditos
        </Link>
      </Text>
    </View>
  );
}

export function EnlaceCanal() {
  const c = useColores();
  return (
    <Pressable onPress={() => Linking.openURL(CANAL_AUTOR)} style={[estilos.boton, { backgroundColor: c.sup2 }]}>
      <Text style={{ color: c.tinta, fontWeight: '600' }}>▶ Suscríbete al canal de {AUTOR}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pie: { paddingVertical: 24, alignItems: 'center' },
  texto: { fontSize: 12, textAlign: 'center' },
  boton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
});

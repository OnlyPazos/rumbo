import { Linking, ScrollView, StyleSheet, Text } from 'react-native';

import { AUTOR, EnlaceCanal, REPO_ORIGINAL } from '@/componentes/Creditos';
import { useColores } from '@/tema';

export default function Acerca() {
  const c = useColores();
  const enlace = { color: c.acento };
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Rumbo, de {AUTOR}</Text>
      <Text style={[estilos.parrafo, { color: c.tinta2 }]}>
        Rumbo es una herramienta gratuita creada por <Text style={{ fontWeight: '700' }}>{AUTOR}</Text>. Todo lo
        que ves aquí lo calcula su motor: precios, rentabilidad, TIR, comparación con un indexado, Renta, traspasos y
        perfiles.
      </Text>
      <Text style={[estilos.parrafo, { color: c.tinta2 }]}>
        Esta app (iOS, Android y web) es un fork que solo le pone otra cara para usarla desde el móvil. Se publica, como
        el original, con licencia MIT.
      </Text>
      <Text style={[estilos.parrafo, enlace]} onPress={() => Linking.openURL(REPO_ORIGINAL)}>
        {REPO_ORIGINAL}
      </Text>
      <Text style={[estilos.parrafo, { color: c.tinta2 }]}>
        Si te resulta útil, la mejor forma de apoyar al autor es suscribirte a su canal de YouTube:
      </Text>
      <EnlaceCanal />
      <Text style={[estilos.aviso, { color: c.tinta3 }]}>
        Herramienta informativa. No es asesoramiento financiero ni una recomendación de inversión. No se garantiza la
        exactitud de los datos ni de los precios.
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 22, fontWeight: '800' },
  parrafo: { fontSize: 15, lineHeight: 22 },
  aviso: { fontSize: 12, lineHeight: 17, marginTop: 12 },
});

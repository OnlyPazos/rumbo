/** Selector de opciones en fila (como los botones 1M · 3M · … · Todo del panel original). */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColores } from '@/tema';

export function Segmentos<T extends string>({
  opciones, activo, alCambiar,
}: {
  opciones: readonly { id: T; et: string }[];
  activo: T;
  alCambiar: (id: T) => void;
}) {
  const c = useColores();
  return (
    <View style={[estilos.fila, { backgroundColor: c.sup2 }]} accessibilityRole="tablist">
      {opciones.map((o) => {
        const on = o.id === activo;
        return (
          <Pressable
            key={o.id}
            onPress={() => alCambiar(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[estilos.boton, on && { backgroundColor: c.sup3 }]}
          >
            <Text style={{ color: on ? c.tinta : c.tinta3, fontWeight: on ? '700' : '500', fontSize: 13 }}>{o.et}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  boton: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
});

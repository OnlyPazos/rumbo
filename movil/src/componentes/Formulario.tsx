/** Piezas de formulario compartidas: campo, chips para elegir, botón y confirmación. */
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { RADIO, useColores } from '@/tema';

export function Campo({ etiqueta, ayuda, derecha, ...props }: TextInputProps & { etiqueta: string; ayuda?: string; derecha?: ReactNode }) {
  const c = useColores();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[estilos.etiqueta, { color: c.tinta2 }]}>{etiqueta}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          placeholderTextColor={c.tinta3}
          {...props}
          style={[estilos.campo, { backgroundColor: c.sup2, color: c.tinta, borderColor: c.borde }, props.style]}
        />
        {derecha}
      </View>
      {ayuda ? <Text style={[estilos.ayuda, { color: c.tinta3 }]}>{ayuda}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({
  opciones, activo, alCambiar, colores,
}: {
  opciones: readonly { id: T; et: string }[];
  activo: T | null;
  alCambiar: (id: T) => void;
  /** Color de cada opción (el del producto), si lo tiene. */
  colores?: Partial<Record<T, string>>;
}) {
  const c = useColores();
  return (
    <View style={estilos.chips}>
      {opciones.map((o) => {
        const on = o.id === activo;
        const color = colores?.[o.id];
        return (
          <Pressable
            key={o.id}
            onPress={() => alCambiar(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[estilos.chip, { backgroundColor: on ? c.sup3 : c.sup2, borderColor: on ? (color ?? c.acento) : c.borde }]}
          >
            {color ? <View style={[estilos.punto, { backgroundColor: color }]} /> : null}
            <Text style={{ color: on ? c.tinta : c.tinta2, fontWeight: on ? '700' : '500', fontSize: 14 }} numberOfLines={1}>
              {o.et}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Boton({
  texto, alPulsar, ocupado, tipo = 'principal', desactivado,
}: { texto: string; alPulsar: () => void; ocupado?: boolean; tipo?: 'principal' | 'secundario' | 'peligro'; desactivado?: boolean }) {
  const c = useColores();
  const fondo = tipo === 'principal' ? c.acento : tipo === 'peligro' ? 'transparent' : c.sup3;
  const color = tipo === 'principal' ? '#fff' : tipo === 'peligro' ? c.mal : c.tinta;
  return (
    <Pressable
      onPress={alPulsar}
      disabled={ocupado || desactivado}
      style={[estilos.boton, { backgroundColor: fondo, opacity: ocupado || desactivado ? 0.55 : 1 },
        tipo === 'peligro' && { borderWidth: 1, borderColor: c.mal }]}
    >
      {ocupado ? <ActivityIndicator color={color} /> : <Text style={{ color, fontWeight: '700', fontSize: 16 }}>{texto}</Text>}
    </Pressable>
  );
}

/** Pide confirmación. En web, Alert de React Native no enseña botones: se usa window.confirm. */
export function confirmar(titulo: string, mensaje: string, accion = 'Aceptar'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? false);
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: accion, style: 'destructive', onPress: () => resolver(true) },
    ], { cancelable: true, onDismiss: () => resolver(false) }),
  );
}

const estilos = StyleSheet.create({
  etiqueta: { fontSize: 13, fontWeight: '600' },
  ayuda: { fontSize: 12, lineHeight: 16 },
  campo: { flex: 1, borderWidth: 1, borderRadius: RADIO, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, maxWidth: '100%' },
  punto: { width: 8, height: 8, borderRadius: 4 },
  boton: { borderRadius: RADIO, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
});

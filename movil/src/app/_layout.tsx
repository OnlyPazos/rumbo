import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ProveedorSesion } from '@/sesion/contexto';
import { useColores } from '@/tema';

export default function Raiz() {
  const c = useColores();
  return (
    // Lo pide react-native-gesture-handler (gráficos que se arrastran sin pelearse con el scroll).
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ProveedorSesion>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.plano },
          headerTintColor: c.tinta,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.plano },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Rumbo' }} />
        <Stack.Screen name="conectar" options={{ title: 'Conectar con tu Rumbo' }} />
        <Stack.Screen name="escanear" options={{ title: 'Escanear QR', presentation: 'modal' }} />
        <Stack.Screen name="anotar" options={{ title: 'Anotar' }} />
        <Stack.Screen name="acerca" options={{ title: 'Acerca de' }} />
      </Stack>
    </ProveedorSesion>
    </GestureHandlerRootView>
  );
}

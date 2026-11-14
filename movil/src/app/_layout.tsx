import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProveedorSesion } from '@/sesion/contexto';
import { useColores } from '@/tema';

export default function Raiz() {
  const c = useColores();
  return (
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
        <Stack.Screen name="acerca" options={{ title: 'Acerca de' }} />
      </Stack>
    </ProveedorSesion>
  );
}

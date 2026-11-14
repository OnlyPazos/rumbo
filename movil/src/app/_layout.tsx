import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ProveedorSesion, useSesion } from '@/sesion/contexto';
import { ProveedorPanel } from '@/sesion/panel';
import { useColores } from '@/tema';

export default function Raiz() {
  const c = useColores();
  return (
    // Lo pide react-native-gesture-handler (gráficos que se arrastran sin pelearse con el scroll).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProveedorSesion>
        <PanelDeEsteServidor>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.plano },
              headerTintColor: c.tinta,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: c.plano },
            }}
          >
            {/* Las pestañas (Panel, El mes, Rendimiento, Más) y, encima, el resto de pantallas. */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="conectar" options={{ title: 'Conectar con tu Rumbo' }} />
            <Stack.Screen name="escanear" options={{ title: 'Escanear QR', presentation: 'modal' }} />
            <Stack.Screen name="anotar" options={{ title: 'Anotar' }} />
            <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
            <Stack.Screen name="editar-producto" options={{ title: 'Producto' }} />
            <Stack.Screen name="periodica" options={{ title: 'Aportación periódica' }} />
            <Stack.Screen name="renta" options={{ title: 'Para la Renta' }} />
            <Stack.Screen name="importar" options={{ title: 'Importar' }} />
            <Stack.Screen name="acerca" options={{ title: 'Acerca de' }} />
          </Stack>
        </PanelDeEsteServidor>
      </ProveedorSesion>
    </GestureHandlerRootView>
  );
}

/** Los datos del panel empiezan de cero al conectar con otro Rumbo. */
function PanelDeEsteServidor({ children }: { children: ReactNode }) {
  const { conexion } = useSesion();
  return <ProveedorPanel key={conexion ? `${conexion.servidor}|${conexion.llave}` : 'sin'}>{children}</ProveedorPanel>;
}

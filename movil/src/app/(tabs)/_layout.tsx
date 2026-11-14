/** Las pestañas de la app: Panel, El mes, Rendimiento y Más (como las del panel web de Rumbo). */
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { IconoMas, IconoMes, IconoPanel, IconoRendimiento } from '@/componentes/Iconos';
import { useSesion } from '@/sesion/contexto';
import { useColores } from '@/tema';

export default function Pestanas() {
  const c = useColores();
  const { cargando, cliente } = useSesion();

  if (cargando) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.plano }}><ActivityIndicator /></View>;
  }
  if (!cliente) return <Redirect href="/conectar" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.plano },
        headerTintColor: c.tinta,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.plano },
        tabBarStyle: { backgroundColor: c.sup, borderTopColor: c.borde },
        tabBarActiveTintColor: c.acento,
        tabBarInactiveTintColor: c.tinta3,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Panel', tabBarIcon: ({ color }) => <IconoPanel color={color} /> }} />
      <Tabs.Screen name="mes" options={{ title: 'El mes', tabBarIcon: ({ color }) => <IconoMes color={color} /> }} />
      <Tabs.Screen name="rendimiento" options={{ title: 'Rendimiento', tabBarIcon: ({ color }) => <IconoRendimiento color={color} /> }} />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: ({ color }) => <IconoMas color={color} /> }} />
    </Tabs>
  );
}

/** Mi objetivo de patrimonio (formObjetivo en app/web/editor.js de Rumbo). Apagado, el panel usa el siguiente hito. */
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorRumbo } from '@/api/cliente';
import { Boton, Campo } from '@/componentes/Formulario';
import { useSesion } from '@/sesion/contexto';
import { usePanel } from '@/sesion/panel';
import { useColores } from '@/tema';

const decimal = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false });

export default function Objetivo() {
  const c = useColores();
  const { cliente } = useSesion();
  const { cargar } = usePanel();
  const [activo, setActivo] = useState(false);
  const [importe, setImporte] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.cartera().then((r) => {
      if (!vigente) return;
      const o = r.cartera.objetivo;
      // Hasta la 1.2 toda cartera traía 100.000 € activados sin elegirlos: eso no es un objetivo propio.
      const propio = Boolean(o?.activo && o.importe && (o.elegido || o.importe !== 100000));
      setActivo(propio);
      setImporte(propio && o.importe ? decimal(o.importe) : '');
      setEtiqueta(propio ? o.etiqueta : '');
    }, () => undefined);
    return () => {
      vigente = false;
    };
  }, [cliente]);

  async function guardar() {
    if (!cliente) return;
    setOcupado(true);
    setErrores([]);
    try {
      await cliente.guardarObjetivo({ activo, importe, etiqueta });
      await cargar();
      router.back();
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
      setOcupado(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Mi objetivo' }} />
      <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.tinta, fontWeight: '700' }}>Usar mi propio objetivo</Text>
            <Text style={{ color: c.tinta3, fontSize: 12 }}>Si lo apagas, la barra del panel va al siguiente hito: 10.000 €, 25.000 €, 50.000 €, 100.000 €…</Text>
          </View>
          <Switch value={activo} onValueChange={setActivo} trackColor={{ true: c.acento, false: c.sup3 }} />
        </View>
        {activo && (
          <>
            <Campo etiqueta="Importe (€)" value={importe} onChangeText={setImporte} placeholder="30.000" keyboardType="decimal-pad" />
            <Campo etiqueta="Nombre" value={etiqueta} onChangeText={setEtiqueta} placeholder="La entrada del piso" maxLength={60} ayuda="Opcional." />
          </>
        )}
        {errores.map((e, i) => <Text key={i} style={{ color: c.mal }}>{e}</Text>)}
        <Boton texto="Guardar" alPulsar={guardar} ocupado={ocupado} />
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
});

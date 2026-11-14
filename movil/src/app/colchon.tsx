/** Mi fondo de emergencia: meses de gastos o un importe fijo (formColchon en app/web/editor.js de Rumbo). */
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { ErrorRumbo } from '@/api/cliente';
import { Boton, Campo, Chips, confirmar } from '@/componentes/Formulario';
import { fmtEuros, numEs } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { usePanel } from '@/sesion/panel';
import { useColores } from '@/tema';

const decimal = (x: number | undefined) => (x == null ? '' : x.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false }));

export default function Colchon() {
  const c = useColores();
  const { cliente } = useSesion();
  const { cargar } = usePanel();
  const [modo, setModo] = useState<'meses' | 'importe'>('meses');
  const [meses, setMeses] = useState('6');
  const [gasto, setGasto] = useState('');
  const [importe, setImporte] = useState('');
  const [existe, setExiste] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.cartera().then((r) => {
      const x = r.cartera.colchon;
      if (!vigente || !x) return;
      setExiste(true);
      setModo(x.modo);
      if (x.modo === 'meses') {
        setMeses(decimal(x.meses));
        setGasto(decimal(x.gastoMensual));
      } else {
        setImporte(decimal(x.importe));
      }
    }, () => undefined);
    return () => {
      vigente = false;
    };
  }, [cliente]);

  const total = modo === 'meses' ? (numEs(meses) ?? 0) * (numEs(gasto) ?? 0) : numEs(importe) ?? 0;

  async function guardar(borrar = false) {
    if (!cliente) return;
    if (borrar && !(await confirmar('Fondo de emergencia', '¿Quitar tu fondo de emergencia?', 'Quitar'))) return;
    setOcupado(true);
    setErrores([]);
    try {
      await cliente.guardarColchon(borrar ? { borrar: true }
        : modo === 'meses' ? { modo, meses, gastoMensual: gasto } : { modo, importe });
      await cargar();
      router.back();
    } catch (e) {
      setErrores(e instanceof ErrorRumbo ? e.errores : [String(e)]);
      setOcupado(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Fondo de emergencia' }} />
      <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.tinta2, lineHeight: 21 }}>
          Lo que quieres tener siempre a mano por si pasa algo (una avería, quedarte sin trabajo…). Lo habitual es entre 3 y 6
          meses de gastos. Rumbo lo compara con tu liquidez y te dice cuánto te sobra para invertir.
        </Text>
        <Chips opciones={[{ id: 'meses', et: 'En meses de gastos' }, { id: 'importe', et: 'Un importe fijo' }] as const} activo={modo} alCambiar={setModo} />
        {modo === 'meses' ? (
          <>
            <Campo etiqueta="Meses" value={meses} onChangeText={setMeses} placeholder="6" keyboardType="decimal-pad" />
            <Campo etiqueta="Lo que gastas al mes (€)" value={gasto} onChangeText={setGasto} placeholder="2.000" keyboardType="decimal-pad" />
          </>
        ) : (
          <Campo etiqueta="Importe (€)" value={importe} onChangeText={setImporte} placeholder="12.000" keyboardType="decimal-pad" />
        )}
        <Text style={{ color: c.tinta, fontWeight: '700' }}>{total > 0 ? `Tu fondo de emergencia: ${fmtEuros(total, true)}` : 'Rellena las cifras.'}</Text>
        {errores.map((e, i) => <Text key={i} style={{ color: c.mal }}>{e}</Text>)}
        <Boton texto="Guardar" alPulsar={() => guardar()} ocupado={ocupado} />
        {existe && <Boton texto="Quitar mi fondo de emergencia" tipo="peligro" alPulsar={() => guardar(true)} desactivado={ocupado} />}
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
});

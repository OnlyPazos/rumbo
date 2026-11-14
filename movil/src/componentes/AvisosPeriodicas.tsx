/**
 * Aviso en el panel de las aportaciones periódicas que toca anotar (avisoPeriodicas en app/web/editor.js
 * de Rumbo): «Revisar y añadir» o «No me lo recuerdes».
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Cartera } from '@/api/tipos';
import { fmtEuros, fmtFecha, hoyISO } from '@/formato';
import { periodicasPendientes } from '@/periodicas';
import { useSesion } from '@/sesion/contexto';
import { RADIO, useColores } from '@/tema';
import { confirmar } from './Formulario';

export function AvisosPeriodicas() {
  const c = useColores();
  const { cliente } = useSesion();
  const [cartera, setCartera] = useState<Cartera | null>(null);

  // Al volver al panel (por ejemplo, tras añadirlas), se mira otra vez qué falta.
  useFocusEffect(
    useCallback(() => {
      if (!cliente) return;
      let vigente = true;
      cliente.cartera().then((r) => vigente && setCartera(r.modo === 'propio' ? r.cartera : null), () => undefined);
      return () => {
        vigente = false;
      };
    }, [cliente]),
  );

  if (!cartera) return null;
  const pendientes = periodicasPendientes(cartera.periodicas, cartera.productos.map((p) => p.id), hoyISO());
  if (!pendientes.length) return null;
  const nombre = (id: string) => {
    const p = cartera.productos.find((x) => x.id === id);
    return p ? p.corto || p.nombre : id;
  };

  async function olvidar(producto: string, dia: number) {
    const ok = await confirmar('Aportación periódica', '¿Dejo de recordarte esta aportación? Las compras que ya anotaste no se tocan.', 'No me lo recuerdes');
    if (!ok || !cliente) return;
    try {
      const r = await cliente.olvidarPeriodicas(producto, dia);
      setCartera(r.cartera);
    } catch {
      // Si falla, el aviso se queda: se puede volver a intentar.
    }
  }

  return (
    <View style={{ gap: 8 }}>
      {pendientes.map((x) => (
        <View key={`${x.producto}|${x.dia}`} style={[estilos.aviso, { backgroundColor: c.sup, borderColor: c.acento }]}>
          <Text style={{ color: c.tinta }}>
            ↻ Aportación periódica de {fmtEuros(x.importe, true)} a {nombre(x.producto)} (día {x.dia}):{' '}
            {x.cuantas === 1 ? `toca anotar la del ${fmtFecha(x.desde)}.` : `faltan ${x.cuantas}, desde el ${fmtFecha(x.desde)}.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Pressable onPress={() => router.push({ pathname: '/periodica', params: { producto: x.producto, importe: String(x.importe), dia: String(x.dia), desde: x.desde } })}>
              <Text style={{ color: c.acento, fontWeight: '700' }}>Revisar y añadir</Text>
            </Pressable>
            <Pressable onPress={() => olvidar(x.producto, x.dia)}>
              <Text style={{ color: c.tinta2 }}>No me lo recuerdes</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: { borderWidth: 1, borderRadius: RADIO, padding: 12, gap: 8 },
});

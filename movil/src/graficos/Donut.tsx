/**
 * Reparto del patrimonio en donut, con su leyenda (donut en app/web/graficos.js de Rumbo).
 * Tocando un sector o una fila de la leyenda, el centro enseña ese grupo.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { fmtEuros, fmtPct } from '@/formato';
import type { Colores } from '@/tema';
import { arcoDonut, fmtEurCorto } from './escala';

export interface DatoDonut {
  nombre: string;
  valor: number;
  color: string;
}

export function Donut({ datos, c, titulo = 'Total', tam = 220 }: { datos: DatoDonut[]; c: Colores; titulo?: string; tam?: number }) {
  const [elegido, setElegido] = useState<number | null>(null);
  const lista = datos.filter((d) => d.valor > 0);
  const total = lista.reduce((s, d) => s + d.valor, 0);
  if (!total) return <Text style={{ color: c.tinta3, textAlign: 'center', paddingVertical: 30 }}>Sin datos.</Text>;

  const R = tam / 2 - 4;
  const r0 = R * 0.62;
  // Ángulo donde empieza cada sector: la suma de los anteriores, desde las 12 en punto.
  const inicios = lista.map((_, i) => -Math.PI / 2 + lista.slice(0, i).reduce((s, d) => s + (d.valor / total) * Math.PI * 2, 0));
  const arcos = lista.map((d, i) => arcoDonut(tam / 2, tam / 2, R, r0, inicios[i], inicios[i] + (d.valor / total) * Math.PI * 2));
  const sel = elegido != null ? lista[elegido] : null;
  const alternar = (i: number) => setElegido((x) => (x === i ? null : i));

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <Svg width={tam} height={tam}>
        {arcos.map((d, i) => (
          <Path
            key={lista[i].nombre} d={d} fill={lista[i].color} onPress={() => alternar(i)}
            opacity={elegido == null || elegido === i ? 1 : 0.35}
          />
        ))}
        <SvgText x={tam / 2} y={tam / 2 - 6} fontSize={12} fill={c.tinta3} textAnchor="middle">
          {sel ? (sel.nombre.length > 18 ? sel.nombre.slice(0, 17) + '…' : sel.nombre) : titulo}
        </SvgText>
        <SvgText x={tam / 2} y={tam / 2 + 18} fontSize={20} fontWeight="700" fill={c.tinta} textAnchor="middle">
          {sel ? fmtPct(sel.valor / total).replace('+', '') : fmtEurCorto(total)}
        </SvgText>
      </Svg>

      <View style={{ alignSelf: 'stretch' }}>
        {lista.map((d, i) => (
          <Pressable
            key={d.nombre} onPress={() => alternar(i)}
            style={[estilos.fila, elegido === i && { backgroundColor: c.sup2 }]}
          >
            <View style={[estilos.punto, { backgroundColor: d.color }]} />
            <Text style={{ color: c.tinta, flex: 1 }} numberOfLines={1}>{d.nombre}</Text>
            <Text style={{ color: c.tinta2, fontVariant: ['tabular-nums'] }}>{fmtEuros(d.valor)}</Text>
            <Text style={[estilos.pct, { color: c.tinta3 }]}>{fmtPct(d.valor / total).replace('+', '')}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8 },
  punto: { width: 10, height: 10, borderRadius: 3 },
  pct: { width: 56, textAlign: 'right', fontVariant: ['tabular-nums'] },
});

/**
 * Aportaciones de cada mes, apiladas por producto (barrasApiladas en app/web/graficos.js de Rumbo).
 * Tocando o arrastrando se ve el desglose del mes.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { fmtEuros } from '@/formato';
import type { Colores } from '@/tema';
import { escalaBonita, etiquetaMes, fmtEurCorto, indicesEjeX, lineasRejilla } from './escala';
import { useTactil } from './useTactil';

const P = { t: 10, r: 8, b: 22, l: 48 };

export interface SerieBarras {
  nombre: string;
  color: string;
  valores: number[];
}

export function BarrasMensuales({ meses, series, c, alto = 200 }: { meses: string[]; series: SerieBarras[]; c: Colores; alto?: number }) {
  const [ancho, setAncho] = useState(0);
  const n = meses.length;
  const iw = Math.max(ancho - P.l - P.r, 1);
  const ih = alto - P.t - P.b;
  const hueco = iw / Math.max(n, 1);
  const { indice, manejadores } = useTactil((px) => (n ? Math.min(n - 1, Math.max(0, Math.floor((px - P.l) / hueco))) : null));

  // Las retiradas (negativas) no se apilan: la barra enseña lo que entró ese mes.
  const totales = meses.map((_, i) => series.reduce((s, x) => s + Math.max(0, x.valores[i] || 0), 0));
  if (!n || !totales.some((t) => t > 0)) {
    return <Text style={{ color: c.tinta3, paddingVertical: 30, textAlign: 'center' }}>Sin aportaciones en este periodo.</Text>;
  }
  const e = escalaBonita(Math.max(...totales));
  const y = (v: number) => P.t + ih - (v / e.max) * ih;
  const anchoBarra = Math.max(1, Math.min(28, hueco * 0.7));

  return (
    <View onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)} {...manejadores}>
      {ancho > 0 && (
        <Svg width={ancho} height={alto}>
          {lineasRejilla(e).map((g) => (
            <Line key={g} x1={P.l} x2={ancho - P.r} y1={y(g)} y2={y(g)} stroke={c.sup3} strokeWidth={1} />
          ))}
          {lineasRejilla(e).map((g) => (
            <SvgText key={`t${g}`} x={P.l - 6} y={y(g) + 4} fontSize={10} fill={c.tinta3} textAnchor="end">
              {fmtEurCorto(g)}
            </SvgText>
          ))}
          {meses.map((m, i) => {
            const x0 = P.l + i * hueco + (hueco - anchoBarra) / 2;
            const vals = series.map((s) => Math.max(0, s.valores[i] || 0));
            return series.map((s, k) => {
              const v = vals[k];
              if (!v) return null;
              const base = vals.slice(0, k).reduce((a, b) => a + b, 0);   // lo apilado debajo
              return (
                <Rect key={`${m}-${s.nombre}`} x={x0} y={y(base + v)} width={anchoBarra} height={y(base) - y(base + v)}
                  fill={s.color} opacity={indice == null || indice === i ? 1 : 0.4} />
              );
            });
          })}
          {indicesEjeX(n, ancho < 400 ? 3 : 5).map((i, k, todos) => (
            <SvgText
              key={`x${i}`} x={P.l + i * hueco + hueco / 2} y={alto - 6} fontSize={10} fill={c.tinta3}
              textAnchor={k === 0 ? 'start' : k === todos.length - 1 ? 'end' : 'middle'}
            >
              {etiquetaMes(meses[i])}
            </SvgText>
          ))}
        </Svg>
      )}

      {indice != null && (
        <View pointerEvents="none" style={[estilos.globo, { backgroundColor: c.sup2, borderColor: c.borde },
          indice > n / 2 ? { left: P.l + 4 } : { right: P.r + 4 }]}>
          <Text style={{ color: c.tinta3, fontSize: 11 }}>{etiquetaMes(meses[indice])}</Text>
          <Text style={{ color: c.tinta, fontWeight: '700', fontSize: 15 }}>{fmtEuros(totales[indice])}</Text>
          {series.filter((s) => (s.valores[indice] || 0) > 0).map((s) => (
            <View key={s.nombre} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
              <Text style={{ color: c.tinta2, fontSize: 11, flex: 1 }} numberOfLines={1}>{s.nombre}</Text>
              <Text style={{ color: c.tinta2, fontSize: 11 }}>{fmtEuros(s.valores[indice])}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  globo: { position: 'absolute', top: P.t, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 160, maxWidth: 240, gap: 2 },
});

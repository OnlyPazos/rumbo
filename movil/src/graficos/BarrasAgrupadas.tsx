/**
 * Barras agrupadas, con valores negativos (barrasAgrupadas y barrasSimples en app/web/graficos.js de
 * Rumbo): lo que pusiste tú frente a lo que puso el mercado cada mes, o la rentabilidad de cada año.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import type { Colores } from '@/tema';
import { escalaBonita, fmtEurCorto, indicesEjeX, lineasRejilla } from './escala';
import { useTactil } from './useTactil';

const P = { t: 10, r: 8, b: 22, l: 52 };

export interface SerieBarra {
  nombre: string;
  color: string;
  valores: (number | null)[];
  /** Color propio de cada barra (p. ej. según el signo); si no, `color`. */
  colores?: string[];
}

export function BarrasAgrupadas({
  categorias, series, c, alto = 220, etiqueta = (x: string) => x, formatoEje = fmtEurCorto, formato = fmtEurCorto, leyenda = true,
}: {
  categorias: string[];
  series: SerieBarra[];
  c: Colores;
  alto?: number;
  /** Texto de cada categoría en el eje y en el globo. */
  etiqueta?: (x: string) => string;
  formatoEje?: (v: number) => string;
  formato?: (v: number) => string;
  leyenda?: boolean;
}) {
  const [ancho, setAncho] = useState(0);
  const n = categorias.length;
  const iw = Math.max(ancho - P.l - P.r, 1);
  const ih = alto - P.t - P.b;
  const hueco = iw / Math.max(n, 1);
  const { indice, gesto } = useTactil((px) => (n ? Math.min(n - 1, Math.max(0, Math.floor((px - P.l) / hueco))) : null));

  const vals = series.flatMap((s) => s.valores).filter((v): v is number => v != null);
  if (!n || !vals.length) return <Text style={{ color: c.tinta3, paddingVertical: 30, textAlign: 'center' }}>Sin datos.</Text>;

  const e = escalaBonita(Math.max(0, ...vals), Math.min(0, ...vals));
  const y = (v: number) => P.t + ih - ((v - e.min) / (e.max - e.min)) * ih;
  const grupo = Math.min(hueco * 0.78, 22 * series.length + 4);
  const barra = Math.max(1, grupo / series.length - (series.length > 1 ? 2 : 0));

  return (
    <GestureDetector gesture={gesto}>
      <View onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)}>
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            {lineasRejilla(e).map((g) => (
              <Line key={g} x1={P.l} x2={ancho - P.r} y1={y(g)} y2={y(g)} stroke={g === 0 ? c.tinta3 : c.sup3} strokeWidth={1} />
            ))}
            {lineasRejilla(e).map((g) => (
              <SvgText key={`t${g}`} x={P.l - 6} y={y(g) + 4} fontSize={10} fill={c.tinta3} textAnchor="end">{formatoEje(g)}</SvgText>
            ))}
            {categorias.map((cat, i) => {
              const x0 = P.l + i * hueco + (hueco - grupo) / 2;
              return series.map((s, k) => {
                const v = s.valores[i];
                if (v == null || v === 0) return null;
                const arriba = y(Math.max(0, v));
                return (
                  <Rect
                    key={`${cat}-${s.nombre}`} x={x0 + k * (barra + 2)} y={arriba} width={barra}
                    height={Math.max(1, Math.abs(y(v) - y(0)))} rx={2}
                    fill={s.colores?.[i] ?? s.color} opacity={indice == null || indice === i ? 1 : 0.4}
                  />
                );
              });
            })}
            {indicesEjeX(n, Math.min(n, ancho < 400 ? 4 : 7)).map((i) => (
              <SvgText key={`x${i}`} x={P.l + i * hueco + hueco / 2} y={alto - 6} fontSize={10} fill={c.tinta3} textAnchor="middle">
                {etiqueta(categorias[i])}
              </SvgText>
            ))}
          </Svg>
        )}

        {indice != null && (
          <View pointerEvents="none" style={[estilos.globo, { backgroundColor: c.sup2, borderColor: c.borde },
            indice > n / 2 ? { left: P.l + 4 } : { right: P.r + 4 }]}>
            <Text style={{ color: c.tinta3, fontSize: 11 }}>{etiqueta(categorias[indice])}</Text>
            {series.map((s) => (
              <View key={s.nombre} style={estilos.fila}>
                <View style={[estilos.marca, { backgroundColor: s.colores?.[indice] ?? s.color }]} />
                <Text style={{ color: c.tinta2, fontSize: 11, flex: 1 }} numberOfLines={1}>{s.nombre}</Text>
                <Text style={{ color: c.tinta, fontSize: 11, fontWeight: '600' }}>
                  {s.valores[indice] == null ? '—' : formato(s.valores[indice] as number)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {leyenda && series.length > 1 && (
          <View style={estilos.leyenda}>
            {series.map((s) => (
              <View key={s.nombre} style={estilos.fila}>
                <View style={[estilos.marca, { backgroundColor: s.color }]} />
                <Text style={{ color: c.tinta2, fontSize: 12 }}>{s.nombre}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const estilos = StyleSheet.create({
  globo: { position: 'absolute', top: P.t, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 170, maxWidth: 240, gap: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marca: { width: 10, height: 10, borderRadius: 3 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 6 },
});

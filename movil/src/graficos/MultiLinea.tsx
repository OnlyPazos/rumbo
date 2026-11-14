/**
 * Varias líneas en el mismo eje (multiLinea en app/web/graficos.js de Rumbo): tu cartera frente a
 * un indexado, o frente a carteras alternativas en base 100. Tocando o arrastrando se ven los valores.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { fmtEuros, fmtFecha } from '@/formato';
import type { Colores } from '@/tema';
import { escalaBonita, etiquetaEjeX, fmtEurCorto, indiceEn, indicesEjeX, lineasRejilla, trazado } from './escala';
import { useTactil } from './useTactil';

const P = { t: 14, r: 12, b: 24, l: 52 };

export interface SerieLinea {
  nombre: string;
  color: string;
  valores: (number | null | undefined)[];
  /** Más gruesa (tu cartera). */
  destacado?: boolean;
}

export function MultiLinea({
  fechas, series, c, alto = 240, desdeCero = false, formatoEje = fmtEurCorto, formato = (v: number) => fmtEuros(v),
}: {
  fechas: string[];
  series: SerieLinea[];
  c: Colores;
  alto?: number;
  desdeCero?: boolean;
  formatoEje?: (v: number) => string;
  formato?: (v: number) => string;
}) {
  const [ancho, setAncho] = useState(0);
  const n = fechas.length;
  const iw = Math.max(ancho - P.l - P.r, 1);
  const ih = alto - P.t - P.b;
  const { indice, gesto } = useTactil((px) => (n ? indiceEn(px, P.l, iw, n) : null));

  const validos = series.flatMap((s) => s.valores).filter((v): v is number => v != null);
  if (!n || !validos.length) {
    return <Text style={{ color: c.tinta3, paddingVertical: 40, textAlign: 'center' }}>Sin datos en este periodo.</Text>;
  }
  const maxV = Math.max(...validos);
  const minV = Math.min(...validos);
  const e = escalaBonita(maxV, desdeCero ? Math.min(0, minV) : minV - (maxV - minV) * 0.08);
  const x = (i: number) => P.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => P.t + ih - ((v - e.min) / (e.max - e.min)) * ih;

  return (
    <GestureDetector gesture={gesto}>
      <View onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)}>
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            {lineasRejilla(e).map((g) => (
              <Line key={g} x1={P.l} x2={ancho - P.r} y1={y(g)} y2={y(g)} stroke={c.sup3} strokeWidth={1} />
            ))}
            {lineasRejilla(e).map((g) => (
              <SvgText key={`t${g}`} x={P.l - 6} y={y(g) + 4} fontSize={10} fill={c.tinta3} textAnchor="end">{formatoEje(g)}</SvgText>
            ))}
            {indicesEjeX(n, ancho < 400 ? 3 : 5).map((i, k, todos) => (
              <SvgText
                key={`x${i}`} x={x(i)} y={alto - 6} fontSize={10} fill={c.tinta3}
                textAnchor={k === 0 ? 'start' : k === todos.length - 1 ? 'end' : 'middle'}
              >
                {etiquetaEjeX(fechas[i], n)}
              </SvgText>
            ))}
            {/* Las destacadas, encima. */}
            {[...series].sort((a, b) => Number(Boolean(a.destacado)) - Number(Boolean(b.destacado))).map((s) => (
              <Path
                key={s.nombre} d={trazado(s.valores, x, y).d} fill="none" stroke={s.color}
                strokeWidth={s.destacado ? 2.5 : 1.6} strokeLinejoin="round" opacity={s.destacado ? 1 : 0.9}
              />
            ))}
            {indice != null && (
              <>
                <Line x1={x(indice)} x2={x(indice)} y1={P.t} y2={P.t + ih} stroke={c.tinta3} strokeWidth={1} />
                {series.map((s) => {
                  const v = s.valores[indice];
                  return v == null ? null : <Circle key={s.nombre} cx={x(indice)} cy={y(v)} r={4} fill={s.color} stroke={c.sup} strokeWidth={1.5} />;
                })}
              </>
            )}
          </Svg>
        )}

        {indice != null && (
          <View pointerEvents="none" style={[estilos.globo, { backgroundColor: c.sup2, borderColor: c.borde },
            x(indice) > ancho / 2 ? { left: P.l + 4 } : { right: P.r + 4 }]}>
            <Text style={{ color: c.tinta3, fontSize: 11 }}>{fmtFecha(fechas[indice])}</Text>
            {series.filter((s) => s.valores[indice] != null).map((s) => (
              <View key={s.nombre} style={estilos.fila}>
                <View style={[estilos.marca, { backgroundColor: s.color }]} />
                <Text style={{ color: c.tinta2, fontSize: 11, flex: 1 }} numberOfLines={1}>{s.nombre}</Text>
                <Text style={{ color: c.tinta, fontSize: 11, fontWeight: s.destacado ? '700' : '400' }}>{formato(s.valores[indice] as number)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={estilos.leyenda}>
          {series.map((s) => (
            <View key={s.nombre} style={estilos.fila}>
              <View style={[estilos.marca, { backgroundColor: s.color, height: s.destacado ? 4 : 3 }]} />
              <Text style={{ color: c.tinta2, fontSize: 12 }} numberOfLines={1}>{s.nombre}</Text>
            </View>
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

const estilos = StyleSheet.create({
  globo: { position: 'absolute', top: P.t, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 180, maxWidth: 250, gap: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marca: { width: 12, height: 3, borderRadius: 2 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 6 },
});

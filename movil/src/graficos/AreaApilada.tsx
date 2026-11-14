/**
 * Áreas apiladas (areaApilada en app/web/graficos.js de Rumbo): por producto, tu dinero frente al
 * mercado o el reparto en %. Tocando o arrastrando se ve el desglose de ese día.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { fmtEuros, fmtFecha } from '@/formato';
import type { Colores } from '@/tema';
import { acumula, escalaBonita, etiquetaEjeX, fmtEurCorto, indiceEn, indicesEjeX, lineasRejilla, trazado } from './escala';
import { useTactil } from './useTactil';

const P = { t: 14, r: 12, b: 24, l: 52 };

export interface SerieArea {
  nombre: string;
  color: string;
  valores: (number | null)[];
}

export function AreaApilada({
  fechas, series, c, alto = 240, aportado, maximo, formatoEje = fmtEurCorto, formato = (v: number) => fmtEuros(v),
}: {
  fechas: string[];
  series: SerieArea[];
  c: Colores;
  alto?: number;
  /** Línea discontinua de lo aportado por encima de las áreas. */
  aportado?: (number | null)[];
  /** Tope fijo del eje (100 en el reparto en %). */
  maximo?: number;
  formatoEje?: (v: number) => string;
  formato?: (v: number) => string;
}) {
  const [ancho, setAncho] = useState(0);
  const n = fechas.length;
  const iw = Math.max(ancho - P.l - P.r, 1);
  const ih = alto - P.t - P.b;
  const { indice, gesto } = useTactil((px) => (n ? indiceEn(px, P.l, iw, n) : null));

  const visibles = series.filter((s) => s.valores.some((v) => v));
  if (!n || !visibles.length) {
    return <Text style={{ color: c.tinta3, paddingVertical: 40, textAlign: 'center' }}>Sin datos en este periodo.</Text>;
  }

  const acum = acumula(visibles.map((s) => s.valores), n);
  const totales = acum[acum.length - 1];
  const tope = Math.max(...totales, ...(aportado ?? []).filter((v): v is number => v != null));
  const e = maximo ? { min: 0, max: maximo, paso: maximo / 4 } : escalaBonita(tope);
  const x = (i: number) => P.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => P.t + ih - ((v - e.min) / (e.max - e.min)) * ih;

  // Cada área va de su línea acumulada a la de debajo.
  const areas = visibles.map((s, k) => {
    const arriba = acum[k];
    const abajo = k === 0 ? null : acum[k - 1];
    let d = '';
    for (let i = 0; i < n; i++) d += `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(arriba[i]).toFixed(1)} `;
    for (let i = n - 1; i >= 0; i--) d += `L${x(i).toFixed(1)} ${y(abajo ? abajo[i] : 0).toFixed(1)} `;
    return `${d}Z`;
  });
  // Separadores finos del color del fondo entre áreas, como en la web.
  const separadores = acum.slice(0, -1).map((a) => trazado(a, x, y).d);
  const lineaAportado = aportado ? trazado(aportado, x, y).d : '';

  return (
    <GestureDetector gesture={gesto}>
      <View onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)}>
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            {lineasRejilla(e).map((g) => (
              <Line key={g} x1={P.l} x2={ancho - P.r} y1={y(g)} y2={y(g)} stroke={c.sup3} strokeWidth={1} />
            ))}
            {lineasRejilla(e).map((g) => (
              <SvgText key={`t${g}`} x={P.l - 6} y={y(g) + 4} fontSize={10} fill={c.tinta3} textAnchor="end">
                {formatoEje(g)}
              </SvgText>
            ))}
            {areas.map((d, k) => <Path key={visibles[k].nombre} d={d} fill={visibles[k].color} fillOpacity={0.9} />).reverse()}
            {separadores.map((d, k) => <Path key={`s${k}`} d={d} fill="none" stroke={c.sup} strokeWidth={1.5} />)}
            {lineaAportado ? (
              <Path d={lineaAportado} fill="none" stroke={c.tinta} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.8} />
            ) : null}
            {indicesEjeX(n, ancho < 400 ? 3 : 5).map((i, k, todos) => (
              <SvgText
                key={`x${i}`} x={x(i)} y={alto - 6} fontSize={10} fill={c.tinta3}
                textAnchor={k === 0 ? 'start' : k === todos.length - 1 ? 'end' : 'middle'}
              >
                {etiquetaEjeX(fechas[i], n)}
              </SvgText>
            ))}
            {indice != null && (
              <>
                <Line x1={x(indice)} x2={x(indice)} y1={P.t} y2={P.t + ih} stroke={c.tinta3} strokeWidth={1} />
                <Circle cx={x(indice)} cy={y(totales[indice])} r={4.5} fill={c.tinta} stroke={c.sup} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}

        {indice != null && (
          <View
            pointerEvents="none"
            style={[estilos.globo, { backgroundColor: c.sup2, borderColor: c.borde },
              x(indice) > ancho / 2 ? { left: P.l + 4 } : { right: P.r + 4 }]}
          >
            <Text style={{ color: c.tinta3, fontSize: 11 }}>{fmtFecha(fechas[indice])}</Text>
            {!maximo && <Text style={{ color: c.tinta, fontWeight: '700', fontSize: 15 }}>{formato(totales[indice])}</Text>}
            {[...visibles].reverse().filter((s) => s.valores[indice]).map((s) => (
              <View key={s.nombre} style={estilos.fila}>
                <View style={[estilos.marca, { backgroundColor: s.color }]} />
                <Text style={{ color: c.tinta2, fontSize: 11, flex: 1 }} numberOfLines={1}>{s.nombre}</Text>
                <Text style={{ color: c.tinta2, fontSize: 11 }}>{formato(s.valores[indice] as number)}</Text>
              </View>
            ))}
            {aportado?.[indice] != null && (
              <View style={estilos.fila}>
                <View style={[estilos.marca, { backgroundColor: c.tinta, height: 2 }]} />
                <Text style={{ color: c.tinta2, fontSize: 11, flex: 1 }}>Aportado</Text>
                <Text style={{ color: c.tinta2, fontSize: 11 }}>{fmtEuros(aportado[indice])}</Text>
              </View>
            )}
          </View>
        )}

        <View style={estilos.leyenda}>
          {visibles.map((s) => (
            <View key={s.nombre} style={estilos.fila}>
              <View style={[estilos.marca, { backgroundColor: s.color }]} />
              <Text style={{ color: c.tinta2, fontSize: 12 }} numberOfLines={1}>{s.nombre}</Text>
            </View>
          ))}
          {aportado && (
            <View style={estilos.fila}>
              <View style={[estilos.marca, { backgroundColor: c.tinta, height: 2, opacity: 0.8 }]} />
              <Text style={{ color: c.tinta2, fontSize: 12 }}>Aportado</Text>
            </View>
          )}
        </View>
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

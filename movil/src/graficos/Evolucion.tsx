/**
 * Evolución del patrimonio con lo aportado en discontinua (lineaConEventos en app/web/graficos.js
 * de Rumbo). Tocando o arrastrando se ve el valor de cada día.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { fmtEuros, fmtFecha, fmtPct } from '@/formato';
import { colorSigno, type Colores } from '@/tema';
import { escalaBonita, etiquetaEjeX, fmtEurCorto, indiceEn, indicesEjeX, lineasRejilla, trazado } from './escala';
import { useTactil } from './useTactil';

const P = { t: 14, r: 12, b: 24, l: 52 };

export function Evolucion({
  fechas, valores, aportado, color, c, alto = 240, nombre = 'Patrimonio', desdeCero = true, formato = fmtEuros, formatoEje = fmtEurCorto,
}: {
  fechas: string[];
  valores: (number | null)[];
  aportado?: (number | null)[];
  color: string;
  c: Colores;
  alto?: number;
  /** Cómo se llama la línea en la leyenda. */
  nombre?: string;
  /** false para precios: el eje empieza cerca del mínimo, no en cero (desdeCero en graficos.js). */
  desdeCero?: boolean;
  /** Formato del valor en el globo (por defecto, euros sin decimales). */
  formato?: (v: number | null) => string;
  /** Formato de las cifras del eje Y (por defecto, euros cortos: 12,5k €). */
  formatoEje?: (v: number) => string;
}) {
  const [ancho, setAncho] = useState(0);
  const n = fechas.length;
  const iw = Math.max(ancho - P.l - P.r, 1);
  const ih = alto - P.t - P.b;
  const { indice, gesto } = useTactil((px) => (n ? indiceEn(px, P.l, iw, n) : null));

  const validos = [...valores, ...(aportado ?? [])].filter((v): v is number => v != null);
  if (!n || !validos.length) {
    return <Text style={{ color: c.tinta3, paddingVertical: 40, textAlign: 'center' }}>Sin datos en este periodo.</Text>;
  }

  const maxV = Math.max(...validos);
  const minV = Math.min(...validos);
  const e = escalaBonita(maxV, desdeCero ? Math.min(0, minV) : minV - (maxV - minV) * 0.12);
  const x = (i: number) => P.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => P.t + ih - ((v - e.min) / (e.max - e.min)) * ih;

  const linea = trazado(valores, x, y);
  const area = linea.primero !== null
    ? `M${x(linea.primero).toFixed(1)} ${P.t + ih} ${linea.d.replace(/^M/, 'L').replace(/ M/g, ' L')} L${x(linea.ultimo!).toFixed(1)} ${P.t + ih} Z`
    : '';
  const lineaAportado = aportado ? trazado(aportado, x, y).d : '';

  const v = indice != null ? valores[indice] : null;
  const a = indice != null ? aportado?.[indice] : null;

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
          {indicesEjeX(n, ancho < 400 ? 3 : 5).map((i, k, todos) => (
            <SvgText
              key={`x${i}`} x={x(i)} y={alto - 6} fontSize={10} fill={c.tinta3}
              textAnchor={k === 0 ? 'start' : k === todos.length - 1 ? 'end' : 'middle'}
            >
              {etiquetaEjeX(fechas[i], n)}
            </SvgText>
          ))}
          {area ? <Path d={area} fill={color} fillOpacity={0.14} /> : null}
          <Path d={linea.d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          {lineaAportado ? (
            <Path d={lineaAportado} fill="none" stroke={c.tinta2} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.75} />
          ) : null}
          {indice != null && (
            <>
              <Line x1={x(indice)} x2={x(indice)} y1={P.t} y2={P.t + ih} stroke={c.tinta3} strokeWidth={1} />
              {v != null && <Circle cx={x(indice)} cy={y(v)} r={4.5} fill={color} stroke={c.sup} strokeWidth={2} />}
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
          <Text style={{ color: c.tinta, fontWeight: '700', fontSize: 15 }}>{formato(v)}</Text>
          {a != null && v != null && (
            <>
              <Text style={{ color: c.tinta2, fontSize: 11 }}>Aportado {fmtEuros(a)}</Text>
              <Text style={{ color: colorSigno(v - a, c), fontSize: 11, fontWeight: '600' }}>
                {fmtEuros(v - a)} · {a > 0 ? fmtPct((v - a) / a) : '—'}
              </Text>
            </>
          )}
        </View>
      )}

      <View style={estilos.leyenda}>
        <View style={[estilos.marca, { backgroundColor: color }]} />
        <Text style={[estilos.textoLeyenda, { color: c.tinta2 }]}>{nombre}</Text>
        {aportado && (
          <>
            <View style={[estilos.marca, { backgroundColor: c.tinta2, opacity: 0.6, height: 2 }]} />
            <Text style={[estilos.textoLeyenda, { color: c.tinta2 }]}>Aportado</Text>
          </>
        )}
      </View>
    </View>
    </GestureDetector>
  );
}

const estilos = StyleSheet.create({
  globo: { position: 'absolute', top: P.t, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 130 },
  leyenda: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  marca: { width: 14, height: 3, borderRadius: 2 },
  textoLeyenda: { fontSize: 12, marginRight: 8 },
});

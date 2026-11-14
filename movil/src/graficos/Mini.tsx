/** Línea pequeña de la evolución de un producto (mini en app/web/graficos.js de Rumbo). */
import Svg, { Path } from 'react-native-svg';

import { trazado } from './escala';

export function Mini({ valores, color, ancho = 64, alto = 26 }: { valores: (number | null)[]; color: string; ancho?: number; alto?: number }) {
  const v = valores.filter((x): x is number => x != null);
  if (v.length < 2) return <Svg width={ancho} height={alto} />;
  const mx = Math.max(...v);
  const mn = Math.min(...v);
  const rango = mx - mn || 1;
  const n = valores.length;
  const { d } = trazado(valores, (i) => (i / (n - 1)) * (ancho - 2) + 1, (x) => alto - 2 - ((x - mn) / rango) * (alto - 4));
  return (
    <Svg width={ancho} height={alto}>
      <Path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Iconos de las pestañas, dibujados con react-native-svg (sin paquetes de iconos). */
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { color: ColorValue; tam?: number };
const trazo = (color: ColorValue) => ({ stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export function IconoPanel({ color, tam = 24 }: Props) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Path d="M3 17l5-5 4 3 7-8" {...trazo(color)} />
      <Path d="M3 21h18" {...trazo(color)} />
    </Svg>
  );
}

export function IconoMes({ color, tam = 24 }: Props) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Rect x={3.5} y={5} width={17} height={15} rx={3} {...trazo(color)} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" {...trazo(color)} />
    </Svg>
  );
}

export function IconoRendimiento({ color, tam = 24 }: Props) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Path d="M5 20V12M10 20V7M15 20v-5M20 20V4" {...trazo(color)} />
    </Svg>
  );
}

export function IconoMas({ color, tam = 24 }: Props) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.8} fill={color} />
      <Circle cx={12} cy={12} r={1.8} fill={color} />
      <Circle cx={19} cy={12} r={1.8} fill={color} />
    </Svg>
  );
}

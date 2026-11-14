/**
 * Colores del panel original de Rumbo (app/web/index.html, variables de :root),
 * para que la app se vea igual que la web de Dani Dominguez Quant.
 */
import { useColorScheme } from 'react-native';

const oscuro = {
  plano: '#0d0d0d', sup: '#1a1a19', sup2: '#232320', sup3: '#2b2b28',
  tinta: '#ffffff', tinta2: '#c3c2b7', tinta3: '#898781',
  borde: 'rgba(255,255,255,0.10)',
  bien: '#0ca30c', mal: '#e66767', aviso: '#fab219', acento: '#3987e5',
};

const claro: typeof oscuro = {
  plano: '#f9f9f7', sup: '#fcfcfb', sup2: '#f2f1ec', sup3: '#e8e7e0',
  tinta: '#0b0b0b', tinta2: '#52514e', tinta3: '#898781',
  borde: 'rgba(11,11,11,0.10)',
  bien: '#006300', mal: '#d03b3b', aviso: '#b07d00', acento: '#2a78d6',
};

export type Colores = typeof oscuro;

export const RADIO = 14;

export function useColores(): Colores {
  return useColorScheme() === 'light' ? claro : oscuro;
}

/** Color de un producto: el motor da [claro, oscuro]. */
export function colorDe(par: [string, string] | undefined, c: Colores) {
  if (!par) return c.tinta3;
  return c === claro ? par[0] : par[1];
}

export function colorSigno(x: number | null | undefined, c: Colores) {
  if (x == null || x === 0) return c.tinta2;
  return x > 0 ? c.bien : c.mal;
}

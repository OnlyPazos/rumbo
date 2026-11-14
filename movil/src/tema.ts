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

/** Los 12 colores de producto (--s1 … --s12 del panel original), en claro y en oscuro. */
const SLOTS_CLARO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948', '#0e8fb0', '#9a6a3a', '#5d6b8a', '#7c9a00'];
const SLOTS_OSCURO = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767', '#2bb0d1', '#c08a55', '#93a1c2', '#9cc21a'];

export const RADIO = 14;

export function useColores(): Colores {
  return useColorScheme() === 'light' ? claro : oscuro;
}

/** Color de un hueco (1–12) de la paleta de productos. */
export function colorSlot(slot: number | null | undefined, c: Colores) {
  const i = Math.min(12, Math.max(1, slot || 1)) - 1;
  return c === claro ? SLOTS_CLARO[i] : SLOTS_OSCURO[i];
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

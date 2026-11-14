/**
 * «Compartir mi mes»: tu mes en una imagen para redes. Portado de app/web/compartir.js de Rumbo
 * (Dani Dominguez Quant): los mismos tres formatos, temas, textos, posiciones y el mismo QR, que
 * lleva al repositorio original. El original dibuja en un <canvas>; aquí es SVG (react-native-svg)
 * con el mismo sistema de coordenadas (1080 de ancho), que luego se captura como PNG.
 *
 * Diferencia: SVG no mide el texto como canvas.measureText. Donde el original encadena textos
 * midiendo el primero («Lo pusiste tú» + « · 0,4 %»), aquí van en un solo <Text> con <TSpan>, que los
 * pone seguidos sin medir. Para encoger lo que no cabe y la píldora del mes, el ancho se estima
 * por el tamaño de letra (anchoTexto).
 */
import type { ReactNode } from 'react';
import Svg, { Circle, G, Line, Path, Rect, TSpan, Text as SvgText } from 'react-native-svg';

import type { ResumenCompartir } from '@/calculos';

export const FORMATOS = {
  mini: { w: 1080, h: 1080, nombre: 'Mini' },
  resumen: { w: 1080, h: 1350, nombre: 'Resumen' },
  story: { w: 1080, h: 1920, nombre: 'Story' },
} as const;
export type Formato = keyof typeof FORMATOS;

export const TEMAS = {
  oscuro: {
    nombre: 'Oscuro', fondo: '#0e0e0d', tinta: '#ffffff', sub: '#a8a69c', linea: '#2c2c29', caja: '#181816',
    pista: '#232320', sube: '#3fcf7e', baja: '#f28b82', curva: '#3fcf7e', aporte: '#3987e5', aporteTxt: '#6aa6f0',
    logoFondo: '#2a78d6', logoTinta: '#ffffff', borde: null as string | null,
  },
  claro: {
    nombre: 'Claro', fondo: '#f7f6f1', tinta: '#121211', sub: '#5b5a55', linea: '#dedcd3', caja: '#ffffff',
    pista: '#e8e6de', sube: '#0b7a3b', baja: '#c43d35', curva: '#0b7a3b', aporte: '#2a78d6', aporteTxt: '#1d5fb4',
    logoFondo: '#2a78d6', logoTinta: '#ffffff', borde: '#dedcd3' as string | null,
  },
  azul: {
    nombre: 'Azul', fondo: '#1d5fb4', tinta: '#ffffff', sub: '#dbe7f7', linea: 'rgba(255,255,255,0.28)',
    caja: 'rgba(255,255,255,0.10)', pista: 'rgba(255,255,255,0.18)', sube: '#ffffff', baja: '#ffd0cc',
    curva: '#ffffff', aporte: '#ffd166', aporteTxt: '#ffd166', logoFondo: '#ffffff', logoTinta: '#1d5fb4', borde: null as string | null,
  },
};
export type Tema = keyof typeof TEMAS;
type T = (typeof TEMAS)[Tema];

// El QR al repositorio de Rumbo, ya calculado (el mismo del original: sin librerías ni internet).
const QR = {
  n: 29, texto: 'Descárgala',
  d: 'M0 0h7v1h-7zM10 0h4v1h-4zM16 0h4v1h-4zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM9 1h2v1h-2zM13 1h3v1h-3zM17 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM9 2h1v1h-1zM12 2h2v1h-2zM16 2h2v1h-2zM19 2h2v1h-2zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM11 3h1v1h-1zM13 3h3v1h-3zM18 3h1v1h-1zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM9 4h1v1h-1zM12 4h3v1h-3zM16 4h1v1h-1zM18 4h1v1h-1zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM10 5h2v1h-2zM13 5h2v1h-2zM18 5h2v1h-2zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM10 7h1v1h-1zM12 7h1v1h-1zM14 7h1v1h-1zM17 7h1v1h-1zM0 8h1v1h-1zM3 8h1v1h-1zM5 8h2v1h-2zM8 8h1v1h-1zM11 8h2v1h-2zM15 8h2v1h-2zM21 8h1v1h-1zM23 8h1v1h-1zM2 9h4v1h-4zM7 9h5v1h-5zM14 9h2v1h-2zM20 9h1v1h-1zM22 9h1v1h-1zM25 9h1v1h-1zM28 9h1v1h-1zM3 10h2v1h-2zM6 10h3v1h-3zM19 10h3v1h-3zM24 10h4v1h-4zM0 11h1v1h-1zM2 11h2v1h-2zM10 11h3v1h-3zM14 11h2v1h-2zM18 11h2v1h-2zM24 11h1v1h-1zM26 11h2v1h-2zM0 12h1v1h-1zM4 12h4v1h-4zM9 12h3v1h-3zM16 12h3v1h-3zM20 12h3v1h-3zM25 12h1v1h-1zM27 12h2v1h-2zM1 13h5v1h-5zM8 13h4v1h-4zM15 13h2v1h-2zM18 13h4v1h-4zM0 14h3v1h-3zM4 14h1v1h-1zM6 14h1v1h-1zM8 14h1v1h-1zM11 14h2v1h-2zM17 14h2v1h-2zM20 14h1v1h-1zM22 14h7v1h-7zM1 15h2v1h-2zM4 15h2v1h-2zM7 15h1v1h-1zM12 15h3v1h-3zM16 15h3v1h-3zM20 15h3v1h-3zM25 15h1v1h-1zM27 15h1v1h-1zM0 16h2v1h-2zM3 16h2v1h-2zM6 16h2v1h-2zM9 16h2v1h-2zM13 16h3v1h-3zM17 16h2v1h-2zM20 16h1v1h-1zM23 16h1v1h-1zM27 16h1v1h-1zM1 17h1v1h-1zM4 17h1v1h-1zM8 17h1v1h-1zM10 17h1v1h-1zM16 17h3v1h-3zM20 17h4v1h-4zM25 17h1v1h-1zM28 17h1v1h-1zM0 18h1v1h-1zM5 18h3v1h-3zM13 18h1v1h-1zM16 18h1v1h-1zM18 18h1v1h-1zM21 18h1v1h-1zM23 18h2v1h-2zM27 18h2v1h-2zM4 19h2v1h-2zM9 19h1v1h-1zM13 19h1v1h-1zM16 19h2v1h-2zM20 19h2v1h-2zM23 19h2v1h-2zM27 19h2v1h-2zM0 20h1v1h-1zM3 20h2v1h-2zM6 20h4v1h-4zM12 20h1v1h-1zM14 20h1v1h-1zM16 20h1v1h-1zM18 20h7v1h-7zM26 20h1v1h-1zM8 21h6v1h-6zM16 21h1v1h-1zM19 21h2v1h-2zM24 21h1v1h-1zM26 21h3v1h-3zM0 22h7v1h-7zM9 22h3v1h-3zM13 22h2v1h-2zM16 22h2v1h-2zM20 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM27 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM8 23h1v1h-1zM11 23h3v1h-3zM15 23h2v1h-2zM18 23h1v1h-1zM20 23h1v1h-1zM24 23h3v1h-3zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM9 24h1v1h-1zM14 24h4v1h-4zM20 24h5v1h-5zM28 24h1v1h-1zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM8 25h1v1h-1zM10 25h5v1h-5zM17 25h4v1h-4zM22 25h6v1h-6zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM9 26h1v1h-1zM14 26h1v1h-1zM18 26h3v1h-3zM24 26h3v1h-3zM28 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM12 27h2v1h-2zM15 27h3v1h-3zM19 27h3v1h-3zM24 27h1v1h-1zM27 27h1v1h-1zM0 28h7v1h-7zM8 28h1v1h-1zM10 28h1v1h-1zM12 28h1v1h-1zM16 28h2v1h-2zM20 28h6v1h-6zM27 28h1v1h-1z',
};

/* ---------------------------------------------- formato de las cifras (como en el original) */
const pct = (v: number | null | undefined, dec = 1) => (v == null ? '—'
  : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(dec).replace('.', ',') + ' %');
const eur = (v: number | null | undefined, signo = false) => (v == null ? '—'
  : (signo && v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('es-ES', { maximumFractionDigits: 0, useGrouping: true }) + ' €');

/* ---------------------------------------------- texto (sin medir: se estima) */
type OpTexto = { tam: number; peso?: number; mono?: boolean; color?: string; alin?: 'left' | 'center' | 'right'; esp?: number; max?: number };
const MONO = 'monospace';

/** Ancho aproximado de un texto: canvas lo mide; aquí se estima por letra según su grosor. */
export function anchoTexto(s: string, o: OpTexto) {
  const factor = o.mono ? 0.6 : (o.peso ?? 400) >= 700 ? 0.58 : 0.53;
  return s.length * (o.tam * factor + (o.esp ?? 0));
}

function texto(t: T, s: string, x: number, y: number, o: OpTexto, clave: string): { el: ReactNode; ancho: number } {
  let tam = o.tam;
  if (o.max) {   // si no cabe, más pequeño (como el original)
    while (tam > 10 && anchoTexto(s, { ...o, tam }) > o.max) tam = Math.floor(tam * 0.94);
  }
  const ancho = anchoTexto(s, { ...o, tam });
  const el = (
    <SvgText
      key={clave} x={x} y={y} fontSize={tam} fontWeight={String(o.peso ?? 400) as never} fill={o.color ?? t.tinta}
      fontFamily={o.mono ? MONO : undefined} letterSpacing={o.esp ?? 0}
      textAnchor={o.alin === 'center' ? 'middle' : o.alin === 'right' ? 'end' : 'start'}
    >
      {s}
    </SvgText>
  );
  return { el, ancho };
}

/* ---------------------------------------------- piezas */
const caja = (x: number, y: number, w: number, h: number, r: number, relleno: string | null, borde: string | null, grosor = 2, clave = '') => (
  <Rect key={clave || `c${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx={r} ry={r}
    fill={relleno ?? 'none'} stroke={borde ?? 'none'} strokeWidth={borde ? grosor : 0} />
);
const raya = (x1: number, y1: number, x2: number, y2: number, col: string, grosor = 2) => (
  <Line key={`r${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={grosor} />
);

/** El logo: brújula sobre un cuadrado redondeado. */
function logo(x: number, y: number, tam: number, fondo: string, tinta: string) {
  return (
    <G key="logo" transform={`translate(${x} ${y}) scale(${tam / 512})`}>
      <Rect x={0} y={0} width={512} height={512} rx={112} fill={fondo} />
      <Circle cx={256} cy={256} r={132} stroke={tinta} strokeWidth={34} fill="none" />
      <Path d="M256 78l22 40h-44z M256 434l22-40h-44z M78 256l40-22v44z M434 256l-40-22v44z" fill={tinta} />
      <Path d="M176 336L236 236L336 176L276 276Z" fill={tinta} />
      <Circle cx={256} cy={256} r={17} fill={fondo} />
    </G>
  );
}

/** QR sobre una baldosa blanca de lado 'tam'. */
function qr(x: number, y: number, tam: number, tinta: string | null, borde: string | null) {
  const margen = tam * 0.09;
  const paso = (tam - 2 * margen) / QR.n;
  return (
    <G key={`qr${x}`}>
      {caja(x, y, tam, tam, tam * 0.11, '#ffffff', borde, 2, `qrf${x}`)}
      <Path d={QR.d} fill={tinta ?? '#0e0e0d'} transform={`translate(${x + margen} ${y + margen}) scale(${paso})`} />
    </G>
  );
}

/** La curva del año (índice de la cartera, sin contar aportaciones), con su área. */
function curva(vals: number[], x: number, y: number, w: number, h: number, col: string, grosor: number) {
  if (!vals || vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = grosor * 2;
  const px = (i: number) => x + pad + (i * (w - 2 * pad)) / (vals.length - 1);
  const py = (v: number) => y + pad + (h - 2 * pad) * (1 - (v - min) / (max - min || 1));
  const linea = vals.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
  const area = `${linea} L${px(vals.length - 1).toFixed(1)} ${y + h} L${px(0).toFixed(1)} ${y + h} Z`;
  return (
    <G key="curva">
      <Path d={area} fill={col} opacity={0.13} />
      <Path d={linea} fill="none" stroke={col} strokeWidth={grosor} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={px(vals.length - 1)} cy={py(vals[vals.length - 1])} r={grosor * 2} fill={col} />
    </G>
  );
}

function candado(x: number, y: number, col: string) {
  return (
    <G key="candado">
      {caja(x, y + 16, 30, 22, 4, null, col, 3, 'cand')}
      <Path d={`M${x + 7} ${y + 16} L${x + 7} ${y + 10} A8 8 0 0 1 ${x + 23} ${y + 10} L${x + 23} ${y + 16}`} stroke={col} strokeWidth={3} fill="none" />
    </G>
  );
}

const etiquetaMes = (d: ResumenCompartir) => (d.enCurso ? 'EN LO QUE VA DE MES' : 'MI CARTERA ESTE MES');
const lineaAno = (d: ResumenCompartir) => (d.anoPct == null ? '' : d.ultimo
  ? `${pct(d.anoPct)} en lo que va de ${d.ano}`
  : `${pct(d.anoPct)} en ${d.ano}, hasta ${d.nombreMes}`);

function cabecera(t: T, x: number, y: number, tamLogo: number) {
  return [
    logo(x, y, tamLogo, t.logoFondo, t.logoTinta),
    texto(t, 'RUMBO', x + tamLogo + 20, y + tamLogo / 2 + tamLogo * 0.17, { tam: Math.round(tamLogo * 0.48), peso: 800, esp: 3 }, 'rumbo').el,
  ];
}

/* ---------------------------------------------- 1 · Mini (1080×1080) */
function mini(t: T, d: ResumenCompartir): ReactNode[] {
  const color = (v: number | null | undefined) => (v != null && v < 0 ? t.baja : t.sube);
  const wPill = anchoTexto(d.etiqueta, { tam: 26, mono: true }) + 48;
  return [
    <Rect key="fondo" x={0} y={0} width={1080} height={1080} fill={t.fondo} />,
    ...cabecera(t, 96, 88, 72),
    caja(984 - wPill, 96, wPill, 56, 28, null, t.linea, 2, 'pill'),
    texto(t, d.etiqueta, 984 - wPill / 2, 133, { tam: 26, peso: 500, mono: true, color: t.sub, alin: 'center' }, 'et').el,
    texto(t, etiquetaMes(d), 96, 330, { tam: 28, peso: 500, mono: true, esp: 4, color: t.sub }, 'em').el,
    texto(t, pct(d.rentMes), 92, 560, { tam: 268, peso: 800, esp: -10, color: color(d.rentMes), max: 888 }, 'rm').el,
    curva(d.serieAno, 96, 600, 888, 140, t.curva, 5),
    texto(t, lineaAno(d), 96, 800, { tam: 38, peso: 500, max: 888 }, 'la').el,
    raya(96, 850, 984, 850, t.linea, 2),
    texto(t, 'Hecho con Rumbo', 96, 920, { tam: 36, peso: 700 }, 'h1').el,
    texto(t, 'Gratis y de código abierto.', 96, 966, { tam: 23, mono: true, color: t.sub }, 'h2').el,
    texto(t, 'Tus datos no salen de tu ordenador.', 96, 998, { tam: 23, mono: true, color: t.sub }, 'h3').el,
    qr(834, 868, 150, null, t.borde),
    texto(t, QR.texto, 909, 1050, { tam: 20, mono: true, color: t.sub, alin: 'center' }, 'qrt').el,
  ];
}

/* ---------------------------------------------- 2 · Resumen (1080×1350) */
function resumen(t: T, d: ResumenCompartir, euros: boolean): ReactNode[] {
  const color = (v: number | null | undefined) => (v != null && v < 0 ? t.baja : t.sube);
  const out: ReactNode[] = [
    <Rect key="fondo" x={0} y={0} width={1080} height={1350} fill={t.fondo} />,
    ...cabecera(t, 80, 80, 60),
    texto(t, 'Mi mes · ' + d.etiqueta, 1000, 119, { tam: 24, peso: 500, mono: true, color: t.sub, alin: 'right' }, 'mm').el,
    texto(t, d.enCurso ? 'EN LO QUE VA DE MES' : 'ESTE MES', 80, 230, { tam: 24, peso: 500, mono: true, esp: 4, color: t.sub }, 'em').el,
    texto(t, pct(d.rentMes), 76, 400, { tam: 196, peso: 800, esp: -8, color: color(d.rentMes), max: euros ? 560 : 640 }, 'rm').el,
    texto(t, 'Rentabilidad de la cartera, sin contar lo que aporté', 80, 444, { tam: 20, mono: true, color: t.sub }, 'rs').el,
  ];
  if (euros) {
    out.push(
      texto(t, 'Patrimonio', 1000, 280, { tam: 22, mono: true, color: t.sub, alin: 'right' }, 'pa').el,
      texto(t, eur(d.patrimonio), 1000, 350, { tam: 64, peso: 700, alin: 'right', max: 380 }, 'pv').el,
      texto(t, eur(d.cambioEur, true) + ' este mes', 1000, 392, { tam: 26, color: color(d.cambioEur), alin: 'right' }, 'pc').el,
    );
  } else {
    out.push(
      candado(970, 270, t.sub),
      texto(t, 'Importes ocultos', 1000, 352, { tam: 28, peso: 700, alin: 'right' }, 'io').el,
      texto(t, 'Comparto cómo voy,', 1000, 386, { tam: 20, mono: true, color: t.sub, alin: 'right' }, 'i1').el,
      texto(t, 'no cuánto tengo.', 1000, 412, { tam: 20, mono: true, color: t.sub, alin: 'right' }, 'i2').el,
    );
  }
  out.push(
    texto(t, 'Mi año, mes a mes', 80, 510, { tam: 22, peso: 500, mono: true, color: t.sub }, 'ma').el,
    curva(d.serieAno, 80, 525, 920, 180, t.curva, 5),
    raya(80, 706, 1000, 706, t.linea, 2),
    texto(t, d.etqIni, 80, 740, { tam: 20, mono: true, color: t.sub }, 'ei').el,
    texto(t, d.etqFin, 1000, 740, { tam: 20, mono: true, color: t.sub, alin: 'right' }, 'ef').el,
  );
  const kpis: [string, string, string][] = [
    ['En el año', pct(d.anoPct), color(d.anoPct)],
    d.tir != null ? ['TIR anual', pct(d.tir), t.tinta] : ['Desde el inicio', pct(d.desdeInicio), t.tinta],
    d.racha >= 1 ? ['Aportando', d.racha + (d.racha === 1 ? ' mes' : ' meses'), t.tinta] : ['Desde el inicio', pct(d.desdeInicio), t.tinta],
    ['Mi patrimonio', pct(d.crecimiento), color(d.crecimiento)],
  ];
  if (kpis[1][0] === kpis[2][0]) kpis[2] = ['Este mes', pct(d.rentMes), color(d.rentMes)];
  kpis.forEach(([etq, valor, col], i) => {
    const x = 80 + i * 234;
    out.push(
      caja(x, 775, 218, 140, 22, t.caja, t.linea, 2, `k${i}`),
      texto(t, etq, x + 22, 822, { tam: 19, mono: true, color: t.sub, max: 180 }, `ke${i}`).el,
      texto(t, valor, x + 22, 884, { tam: 42, peso: 700, color: col, max: 176 }, `kv${i}`).el,
    );
  });
  out.push(texto(t, 'De dónde sale el cambio del mes', 80, 975, { tam: 22, peso: 500, mono: true, color: t.sub }, 'dd').el);
  const a = Math.abs(d.aportadoEur || 0);
  const m = Math.abs(d.mercadoEur || 0);
  const total = a + m;
  out.push(caja(80, 995, 920, 30, 15, t.pista, null, 2, 'pista'));
  if (total > 0) {
    const wa = (920 * a) / total;
    if (wa > 1) out.push(caja(80, 995, Math.max(wa - 2, 30), 30, 15, t.aporte, null, 2, 'ba'));
    if (920 - wa > 1) out.push(caja(80 + wa + 2, 995, Math.max(920 - wa - 2, 30), 30, 15, color(d.mercadoEur), null, 2, 'bm'));
  }
  const vA = euros ? eur(d.aportadoEur, true) : pct(d.porAportado);
  const vM = euros ? eur(d.mercadoEur, true) : pct(d.porMercado);
  out.push(
    // Etiqueta y valor seguidos en un solo texto (el original mide la etiqueta; aquí no hace falta).
    <SvgText key="ta" x={80} y={1065} fontSize={27} fill={t.tinta}>
      <TSpan fontWeight="700" fill={t.aporteTxt}>Lo pusiste tú</TSpan>
      <TSpan>{' · ' + vA}</TSpan>
    </SvgText>,
    <SvgText key="tm" x={1000} y={1065} fontSize={27} fill={t.tinta} textAnchor="end">
      <TSpan fontWeight="700" fill={color(d.mercadoEur)}>{(d.mercadoEur ?? 0) < 0 ? 'Lo restó el mercado' : 'Lo puso el mercado'}</TSpan>
      <TSpan>{' · ' + vM}</TSpan>
    </SvgText>,
    raya(80, 1105, 1000, 1105, t.linea, 2),
    texto(t, '¿Quieres el tuyo? Hazte tu Rumbo', 80, 1170, { tam: 34, peso: 700, max: 740 }, 'q1').el,
    texto(t, 'Gratis y de código abierto.', 80, 1210, { tam: 21, mono: true, color: t.sub }, 'q2').el,
    texto(t, 'Tus datos no salen de tu ordenador.', 80, 1240, { tam: 21, mono: true, color: t.sub }, 'q3').el,
    qr(860, 1125, 140, null, t.borde),
  );
  return out;
}

/* ---------------------------------------------- 3 · Story (1080×1920) */
function story(t: T, d: ResumenCompartir): ReactNode[] {
  const color = (v: number | null | undefined) => (v != null && v < 0 ? t.baja : t.sube);
  const out: ReactNode[] = [
    <Rect key="fondo" x={0} y={0} width={1080} height={1920} fill={t.fondo} />,
    ...cabecera(t, 80, 150, 76),
    texto(t, d.etiqueta, 1000, 198, { tam: 28, peso: 500, mono: true, color: t.sub, alin: 'right' }, 'et').el,
    texto(t, etiquetaMes(d), 80, 420, { tam: 32, peso: 500, mono: true, esp: 4, color: t.sub }, 'em').el,
    texto(t, pct(d.rentMes), 72, 700, { tam: 330, peso: 800, esp: -14, max: 930, color: color(d.rentMes) }, 'rm').el,
    curva(d.serieAno, 80, 760, 920, 260, t.curva, 7),
  ];
  const filas: [string, string][] = [];
  if (d.anoPct != null) filas.push([pct(d.anoPct), d.ultimo ? 'en lo que va de año' : `en ${d.ano}, hasta ${d.nombreMes}`]);
  if (d.racha >= 2) filas.push([String(d.racha), 'meses seguidos invirtiendo']);
  else if (d.desdeInicio != null) filas.push([pct(d.desdeInicio), 'desde que empecé']);
  filas.slice(0, 2).forEach(([grande, peque], i) => {
    const y = 1110 + i * 130;
    // La cifra grande y su explicación seguidas; la explicación encoge si no cabe en lo que queda.
    const resto = 920 - anchoTexto(grande, { tam: 76, peso: 800 }) - 24;
    let tamP = 38;
    while (tamP > 10 && anchoTexto(peque, { tam: tamP, peso: 500 }) > resto) tamP = Math.floor(tamP * 0.94);
    out.push(
      <Line key={`fl${i}`} x1={80} y1={y} x2={1000} y2={y} stroke={t.linea} strokeWidth={3} />,
      <SvgText key={`fg${i}`} x={80} y={y + 90} fill={t.tinta}>
        <TSpan fontSize={76} fontWeight="800">{grande}</TSpan>
        <TSpan dx={24} fontSize={tamP} fontWeight="500" fill={t.sub}>{peque}</TSpan>
      </SvgText>,
    );
  });
  out.push(
    caja(80, 1420, 920, 330, 40, '#ffffff', t.borde, 2, 'tarjeta'),
    qr(110, 1460, 250, '#121211', null),
    texto(t, '¿Quieres el tuyo?', 392, 1530, { tam: 48, peso: 800, color: '#121211', max: 580 }, 's1').el,
    texto(t, 'Rumbo es gratis y de código', 392, 1585, { tam: 30, color: '#3f3e3a' }, 's2').el,
    texto(t, 'abierto. Escanea y llévatelo.', 392, 1625, { tam: 30, color: '#3f3e3a' }, 's3').el,
    texto(t, 'Tus datos no salen de tu ordenador.', 392, 1690, { tam: 22, mono: true, color: '#5b5a55', max: 580 }, 's4').el,
  );
  return out;
}

/** La imagen, a `ancho` píxeles de pantalla (el dibujo siempre es de 1080 de ancho, como el original). */
export function ImagenMes({ datos, formato, tema, euros, ancho }: { datos: ResumenCompartir; formato: Formato; tema: Tema; euros: boolean; ancho: number }) {
  const f = FORMATOS[formato];
  const t = TEMAS[tema];
  const piezas = formato === 'mini' ? mini(t, datos) : formato === 'resumen' ? resumen(t, datos, euros) : story(t, datos);
  return (
    <Svg width={ancho} height={(ancho * f.h) / f.w} viewBox={`0 0 ${f.w} ${f.h}`}>
      {piezas}
    </Svg>
  );
}

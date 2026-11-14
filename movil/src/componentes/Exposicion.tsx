/**
 * «Dónde está tu dinero» (pintaExpoTotal) y «Qué hay dentro» de un producto (pintaExposicion), de
 * app/web/app.js de Rumbo. Las sumas son las de agregaExposicion (src/calculos.ts, con sus pruebas).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ProductoCalculado } from '@/api/tipos';
import { agregaExposicion, type Exposicion } from '@/calculos';
import { fmtEuros, fmtFecha } from '@/formato';
import { RADIO, colorSlot, type Colores } from '@/tema';
import { Segmentos } from './Segmentos';

const pct = (v: number) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;

/** Barras horizontales ordenadas, con su % (barrasHorizontales en graficos.js). */
export function BarrasHorizontales({ datos, color, c }: { datos: [string, number][]; color: string; c: Colores }) {
  if (!datos.length) return <Text style={{ color: c.tinta3 }}>Sin datos.</Text>;
  const max = Math.max(...datos.map(([, v]) => v)) || 1;
  return (
    <View style={{ gap: 7 }}>
      {datos.map(([nombre, v]) => (
        <View key={nombre} style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ color: c.tinta2, fontSize: 13, flex: 1 }} numberOfLines={1}>{nombre}</Text>
            <Text style={{ color: c.tinta, fontSize: 13, fontVariant: ['tabular-nums'] }}>{pct(v)}</Text>
          </View>
          <View style={[estilos.pista, { backgroundColor: c.sup3 }]}>
            <View style={{ width: `${(v / max) * 100}%`, height: '100%', borderRadius: 3, backgroundColor: color, opacity: nombre === 'Otros' ? 0.5 : 1 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Países y sectores de todo lo que tienes en bolsa: cada producto pesa lo que vale. */
export function DondeEstaTuDinero({ productos, c }: { productos: ProductoCalculado[]; c: Colores }) {
  const [ver, setVer] = useState<'paises' | 'sectores'>('paises');
  const r = agregaExposicion(productos);
  if (!(r.enBolsa > 0)) return null;
  const total = r.enBolsa + r.fuera + r.sinDatos;
  const lp = r.paises;
  const ls = r.sectores;
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Dónde está tu dinero</Text>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        De lo que tienes en bolsa: {fmtEuros(r.enBolsa)} ({Math.round((r.enBolsa / total) * 100)} % de tu patrimonio)
      </Text>
      {lp.length > 0 && (
        <Text style={{ color: c.tinta2, lineHeight: 20 }}>
          El <Text style={{ fontWeight: '700', color: c.tinta }}>{Math.round(lp[0][1])} %</Text> de lo que tienes en bolsa está en{' '}
          <Text style={{ fontWeight: '700', color: c.tinta }}>{lp[0][0]}</Text>
          {ls.length ? <>, y el <Text style={{ fontWeight: '700', color: c.tinta }}>{Math.round(ls[0][1])} %</Text> es {ls[0][0].toLowerCase()}.</> : '.'}
        </Text>
      )}
      <Segmentos opciones={[{ id: 'paises', et: 'Por país' }, { id: 'sectores', et: 'Por sector' }] as const} activo={ver} alCambiar={setVer} />
      <BarrasHorizontales c={c} datos={ver === 'paises' ? lp : ls} color={colorSlot(ver === 'paises' ? 1 : 3, c)} />
      {r.fuera > 1 && <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Fuera de bolsa (renta fija, liquidez, cripto…): {fmtEuros(r.fuera)}.</Text>}
      {r.sinDatos > 1 && (
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
          Sin reparto: {fmtEuros(r.sinDatos)} ({r.sinNombre.slice(0, 4).join(', ')}{r.sinNombre.length > 4 ? '…' : ''}). Si es un plan o una
          cartera que no cotiza, en el panel web puedes decir a qué fondo se parece («reparto como el de») y Rumbo usará el suyo.
        </Text>
      )}
    </View>
  );
}

/** Qué hay dentro de un producto: países, sectores y sus 10 mayores posiciones. */
export function QueHayDentro({ e, color, fechaExtracto, c }: { e: Exposicion | null | undefined; color: string; fechaExtracto: string; c: Colores }) {
  const [ver, setVer] = useState<'paises' | 'sectores'>('paises');
  if (!e || (!(e.paises ?? []).length && !(e.sectores ?? []).length)) return null;
  const meses = e.actualizado ? (Date.parse(fechaExtracto) - Date.parse(e.actualizado)) / (30.44 * 864e5) : 0;
  const viejo = meses > 6;
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Qué hay dentro</Text>
      {e.actualizado && (
        <Text style={[estilos.pequeno, { color: viejo ? c.aviso : c.tinta3 }]}>
          {viejo ? '⚠ ' : ''}Datos a {fmtFecha(e.actualizado)}{viejo ? ' · conviene refrescarlos' : ''}
        </Text>
      )}
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        {e.constituyentes ? `${e.constituyentes.toLocaleString('es-ES')} empresas. ` : ''}{e.fuente ? `${e.fuente}. ` : ''}
        {e.empresa ? 'Es una sola empresa: todo está en su país y su sector.' : ''}
        {e.rv != null && e.rv < 0.97 && !e.empresa ? `Es el reparto de su parte en bolsa, que es el ${Math.round(e.rv * 100)} % del producto.` : ''}
      </Text>
      <Segmentos opciones={[{ id: 'paises', et: 'Por país' }, { id: 'sectores', et: 'Por sector' }] as const} activo={ver} alCambiar={setVer} />
      <BarrasHorizontales c={c} datos={(ver === 'paises' ? e.paises : e.sectores) ?? []} color={color} />
      {e.top10?.length ? (
        <>
          <Text style={[estilos.subtitulo, { color: c.tinta3 }]}>
            Las 10 mayores posiciones · {e.top10.reduce((a, x) => a + x[1], 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} % del fondo
          </Text>
          {e.top10.map(([n, v]) => (
            <View key={n} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: c.tinta2, flex: 1 }} numberOfLines={1}>{n}</Text>
              <Text style={{ color: c.tinta, fontVariant: ['tabular-nums'] }}>{v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 10 },
  titulo: { fontSize: 16, fontWeight: '700' },
  subtitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden' },
});

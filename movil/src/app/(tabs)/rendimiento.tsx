/**
 * Rendimiento: la pestaña «Rendimiento» del panel original de Rumbo (pintaRendimiento,
 * pintaComparacion y pintaDividendos en app/web/app.js).
 */
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import type { Comparacion, PanelDatos, ProductoCalculado } from '@/api/tipos';
import { PieCreditos } from '@/componentes/Creditos';
import { Chips } from '@/componentes/Formulario';
import { Segmentos } from '@/componentes/Segmentos';
import { fmtEuros, fmtFecha, fmtPct } from '@/formato';
import { BarrasAgrupadas } from '@/graficos/BarrasAgrupadas';
import { RANGOS, desdeIdx, fmtEurCorto, type Rango } from '@/graficos/escala';
import { MultiLinea } from '@/graficos/MultiLinea';
import { usePanelAlEnfocar } from '@/sesion/panel';
import { RADIO, colorDe, colorSigno, colorSlot, useColores, type Colores } from '@/tema';

/** Comisión en tanto por uno → «0,12 %» (con `dec` decimales, como fmtPct de la web). */
const pctDec = (v: number, dec: number) => `${(v * 100).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })} %`;
const pctSigno = (v: number | null | undefined) => fmtPct(v);
const pctSinSigno = (v: number | null | undefined) => fmtPct(v).replace('+', '');

export default function Rendimiento() {
  const c = useColores();
  const { panel, error } = usePanelAlEnfocar();

  if (error) return <Centro c={c}><Text style={{ color: c.mal, padding: 20 }}>{error}</Text></Centro>;
  if (!panel) return <Centro c={c}><ActivityIndicator /></Centro>;
  const datos = panel.datos;
  if (!datos) return <Centro c={c}><Text style={{ color: c.tinta3, padding: 20 }}>Aún no hay datos que comparar.</Text></Centro>;
  const productos = [...datos.productos, ...datos.otrosActivos];

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <ConIndexado datos={datos} c={c} />
      <PorAno datos={datos} productos={productos} c={c} />
      <Alternativas datos={datos} c={c} />
      <SeccionDividendos datos={datos} productos={productos} c={c} />
      <SeccionComisiones datos={datos} c={c} />
      <PieCreditos />
    </ScrollView>
  );
}

/** «¿Y si lo hubieras metido todo en un indexado?» */
function ConIndexado({ datos, c }: { datos: PanelDatos; c: Colores }) {
  const C: Comparacion | null = datos.comparacion;
  const [ref, setRef] = useState<string | null>(null);
  const [rango, setRango] = useState<Rango>('todo');
  return (
    <Tarjeta c={c}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>¿Y si lo hubieras metido todo en un indexado?</Text>
      {!C || !C.referencias.length ? (
        <Text style={{ color: c.tinta3 }}>
          Aparecerá cuando tengas compras anotadas y Rumbo haya descargado los precios del índice de referencia.
        </Text>
      ) : (
        (() => {
          const r = C.referencias.find((x) => x.id === ref) ?? C.referencias[0];
          const dif = C.tuValor - r.valor;
          const pct = r.valor ? dif / r.valor : 0;
          const veredicto = Math.abs(pct) < 0.005 ? `Vas prácticamente igual que el ${r.nombre}.`
            : dif > 0 ? `Vas ${fmtEuros(Math.abs(dif))} por delante del ${r.nombre} (${fmtPct(pct)}).`
            : `Con el ${r.nombre} tendrías ${fmtEuros(Math.abs(dif))} más (${fmtPct(-dif / C.tuValor)}).`;
          const i0 = desdeIdx(datos.fechas, datos.fechaExtracto, rango);
          const corta = <T,>(a: T[]) => a.slice(i0);
          return (
            <>
              <Chips opciones={C.referencias.map((x) => ({ id: x.id, et: x.nombre }))} activo={r.id} alCambiar={setRef} />
              <View style={estilos.cajas}>
                <Cifra c={c} titulo="Tú tienes hoy" valor={fmtEuros(C.tuValor)} nota={`TIR ${pctSigno(C.tuTir)}`} />
                <Cifra c={c} titulo={`Con el ${r.nombre} tendrías`} valor={fmtEuros(r.valor)} nota={`TIR ${pctSigno(r.tir)}`} />
              </View>
              <Text style={{ color: dif >= 0 ? c.bien : c.tinta, fontWeight: '700' }}>{veredicto}</Text>
              <Segmentos opciones={RANGOS} activo={rango} alCambiar={setRango} />
              <MultiLinea
                c={c} desdeCero fechas={corta(datos.fechas)}
                series={[
                  { nombre: 'Tu cartera', valores: corta(C.tuya), color: colorSlot(1, c), destacado: true },
                  { nombre: `Con el ${r.nombre}`, valores: corta(r.serie), color: colorSlot(2, c) },
                  { nombre: 'Tu dinero puesto', valores: corta(C.aportado), color: c.tinta3 },
                ]}
              />
              <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
                {r.detalle} Solo cuenta los productos con compras anotadas, desde el {fmtFecha(C.desde)}. Sin impuestos ni
                comisiones de compra.{r.aviso ? ` ${r.aviso}` : ''}
              </Text>
            </>
          );
        })()
      )}
    </Tarjeta>
  );
}

/** Rentabilidad de cada año: la de la cartera y la de cada producto. */
function PorAno({ datos, productos, c }: { datos: PanelDatos; productos: ProductoCalculado[]; c: Colores }) {
  const ra = datos.rentabilidadAnual;
  if (!ra?.anos.length) return null;
  const etiqueta = (a: string) => a + (ra.parcial[ra.anos.indexOf(a)] ? ' *' : '');
  const conTabla = productos.filter((p) => ra.porProducto[p.id]);
  const corto = (iso: string) => fmtFecha(iso).slice(0, 5);
  return (
    <Tarjeta c={c}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Rentabilidad de cada año</Text>
      <BarrasAgrupadas
        c={c} categorias={ra.anos} etiqueta={etiqueta} leyenda={false}
        formatoEje={(v) => `${Math.round(v * 100)} %`} formato={pctSigno}
        series={[{
          nombre: 'Tu cartera', color: colorSlot(1, c), valores: ra.cartera,
          colores: ra.cartera.map((v) => ((v ?? 0) >= 0 ? colorSlot(1, c) : colorSlot(2, c))),
        }]}
      />
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        Tu cartera completa, limpia del efecto de cuándo metiste el dinero. * año incompleto.
      </Text>
      {conTabla.map((p) => (
        <View key={p.id} style={[estilos.fila, { borderColor: c.borde }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[estilos.punto, { backgroundColor: colorDe(p.slotColor, c) }]} />
            <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={1}>{p.corto || p.nombre}</Text>
          </View>
          <View style={estilos.anos}>
            {ra.anos.map((a, i) => {
              const v = ra.porProducto[p.id][i];
              const desde = ra.desde?.[p.id]?.[i];
              return (
                <View key={a} style={{ minWidth: 70 }}>
                  <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{etiqueta(a)}</Text>
                  {v == null ? (
                    <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{ra.vendido?.[p.id]?.[i] ? 'vendido' : '—'}</Text>
                  ) : (
                    <Text style={{ color: colorSigno(v, c), fontWeight: '600' }}>
                      {fmtPct(v)}{desde ? <Text style={[estilos.pequeno, { color: c.tinta3, fontWeight: '400' }]}> · desde {corto(desde)}</Text> : null}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {conTabla.length > 0 && (
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
          Tu rentabilidad en cada producto y año, desde el precio real al que compraste y con comisiones.
        </Text>
      )}
    </Tarjeta>
  );
}

/** Tu cartera frente a otras con pesos fijos (base 100) y su riesgo. */
function Alternativas({ datos, c }: { datos: PanelDatos; c: Colores }) {
  const comp = datos.comparador ?? [];
  if (!comp.length || !comp[0].metricas) return null;
  const paleta = [1, 2, 3, 4, 5, 7, 6].map((s) => colorSlot(s, c));
  const series = comp.map((x, i) => ({
    nombre: x.nombre, valores: x.indice, destacado: x.real, color: x.real ? c.tinta : paleta[(i + 1) % paleta.length],
  }));
  const m0 = comp[0].metricas;
  const anos = (Date.parse(m0.hasta) - Date.parse(m0.desde)) / 3.1536e10;
  return (
    <Tarjeta c={c}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Frente a otras carteras</Text>
      <MultiLinea c={c} fechas={datos.fechas} series={series} formatoEje={(v) => String(Math.round(v))}
        formato={(v) => v.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} />
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        Base 100 desde el {fmtFecha(m0.desde)}. Las alternativas son comprar y mantener con pesos fijos.
      </Text>
      {comp.map((x, i) => {
        const m = x.metricas;
        return (
          <View key={x.id} style={[estilos.fila, { borderColor: c.borde }, x.real && { backgroundColor: c.sup2, borderRadius: 8, paddingHorizontal: 6 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[estilos.punto, { backgroundColor: series[i].color }]} />
              <Text style={{ color: c.tinta, fontWeight: x.real ? '700' : '600', flex: 1 }} numberOfLines={1}>{x.nombre}</Text>
              <Text style={{ color: colorSigno(m.rentTotal, c), fontWeight: '700' }}>{pctSigno(m.rentTotal)}</Text>
            </View>
            <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
              {`Anualizada ${pctSigno(m.cagr)} · volatilidad ${pctSinSigno(m.vol)} · Sharpe ${m.sharpe == null ? '—' : m.sharpe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · máx. caída ${pctSinSigno(m.maxDD)}`}
            </Text>
          </View>
        );
      })}
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        La volatilidad mide cuánto se mueve la cartera; el Sharpe, cuánta rentabilidad sacas por cada unidad de ese
        meneo (más alto, mejor). Son solo {anos.toLocaleString('es-ES', { maximumFractionDigits: 1 })} años de datos: valen
        para comparar entre ellas, no como pronóstico.
      </Text>
    </Tarjeta>
  );
}

function SeccionDividendos({ datos, productos, c }: { datos: PanelDatos; productos: ProductoCalculado[]; c: Colores }) {
  const dv = datos.dividendos;
  const anoActual = datos.fechaExtracto.slice(0, 4);
  return (
    <Tarjeta c={c}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Dividendos, cupones e intereses</Text>
      {!dv?.porProducto.length ? (
        <Text style={{ color: c.tinta3 }}>
          Cuando anotes un dividendo, un cupón o unos intereses («+ Anotar» → Dividendo / interés), aquí verás cuánto te
          pagan tus inversiones cada año sin vender nada.
        </Text>
      ) : (
        <>
          <View style={estilos.cajas}>
            <Cifra c={c} titulo="Cobrado en total" valor={fmtEuros(dv.total)} nota={`${dv.porProducto.reduce((s, l) => s + l.cobros, 0)} cobros`} />
            <Cifra c={c} titulo="Últimos 12 meses" valor={fmtEuros(dv.ultimos12)} nota={`${fmtEuros(dv.ultimos12 / 12)} al mes de media`} />
          </View>
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
            Rentabilidad por dividendo (12 meses, sobre lo que vale hoy): {dv.rentabilidad != null ? pctSinSigno(dv.rentabilidad) : '—'}
          </Text>
          <BarrasAgrupadas
            c={c} categorias={dv.porAno.map(([a]) => a)} etiqueta={(a) => a + (a === anoActual ? ' *' : '')} leyenda={false}
            formato={(v) => fmtEuros(v)}
            series={[{ nombre: 'Cobrado', color: colorSlot(3, c), valores: dv.porAno.map(([, v]) => v) }]}
          />
          {dv.porProducto.map((l) => {
            const p = productos.find((x) => x.id === l.id);
            return (
              <View key={l.id} style={[estilos.fila, { borderColor: c.borde }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[estilos.punto, { backgroundColor: colorDe(p?.slotColor, c) }]} />
                  <Text style={{ color: c.tinta, fontWeight: '600', flex: 1 }} numberOfLines={1}>{p?.corto || p?.nombre || l.id}</Text>
                  <Text style={{ color: c.tinta, fontWeight: '700' }}>{fmtEuros(l.total)}</Text>
                </View>
                <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
                  {`12 meses ${fmtEuros(l.ultimos12)} · sobre lo que vale ${l.sobreValor != null ? pctSinSigno(l.sobreValor) : '—'} · sobre lo que pusiste ${l.sobreCoste != null ? pctSinSigno(l.sobreCoste) : '—'} · último ${fmtFecha(l.ultimo)}`}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </Tarjeta>
  );
}

function SeccionComisiones({ datos, c }: { datos: PanelDatos; c: Colores }) {
  const cm = datos.comisiones;
  if (!cm?.lineas.length) return null;
  return (
    <Tarjeta c={c}>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Lo que pagas en comisiones</Text>
      <Text style={{ color: c.tinta2 }}>
        {fmtEuros(cm.anual)} al año · {pctDec(cm.terPonderado, 3)} de lo invertido ({fmtEuros(cm.anual / 12, true)} al mes)
      </Text>
      {cm.lineas.map((l) => (
        <View key={l.id} style={[estilos.fila, { borderColor: c.borde, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <View style={[estilos.punto, { backgroundColor: colorDe(l.color, c) }]} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={1}>{l.nombre}</Text>
            <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{pctDec(l.ter, 2)} sobre {fmtEurCorto(l.valor)}</Text>
          </View>
          <Text style={{ color: c.tinta }}>{fmtEuros(l.anual, true)}/año</Text>
        </View>
      ))}
      {cm.compraventaPagada ? (
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Además, has pagado {fmtEuros(cm.compraventaPagada, true)} en comisiones de compra y venta.</Text>
      ) : null}
    </Tarjeta>
  );
}

function Cifra({ c, titulo, valor, nota }: { c: Colores; titulo: string; valor: string; nota?: string }) {
  return (
    <View style={[estilos.cifra, { backgroundColor: c.sup2 }]}>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]} numberOfLines={2}>{titulo}</Text>
      <Text style={{ color: c.tinta, fontWeight: '800', fontSize: 18 }}>{valor}</Text>
      {nota ? <Text style={[estilos.pequeno, { color: c.tinta2 }]}>{nota}</Text> : null}
    </View>
  );
}

function Tarjeta({ c, children }: { c: Colores; children: React.ReactNode }) {
  return <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>{children}</View>;
}

function Centro({ c, children }: { c: Colores; children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.plano }}>{children}</View>;
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 10 },
  titulo: { fontSize: 16, fontWeight: '700' },
  pequeno: { fontSize: 12, lineHeight: 17 },
  cajas: { flexDirection: 'row', gap: 10 },
  cifra: { flex: 1, borderRadius: 12, padding: 12, gap: 2 },
  fila: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  anos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

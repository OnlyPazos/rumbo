/**
 * Para la Renta: el resumen fiscal de un año del panel original de Rumbo (pintaFiscal en app/web/app.js,
 * calculado en app/fiscal.py). Orientativo, para repasar el borrador; se puede compartir en CSV.
 */
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ErrorRumbo } from '@/api/cliente';
import type { InformeFiscal, VentaFiscal } from '@/api/tipos';
import { compartirTexto } from '@/compartir';
import { PieCreditos } from '@/componentes/Creditos';
import { Boton, Chips } from '@/componentes/Formulario';
import { fmtEuros, fmtFecha } from '@/formato';
import { useSesion } from '@/sesion/contexto';
import { RADIO, colorSigno, useColores, type Colores } from '@/tema';

const conSigno = (v: number) => (v > 0 ? '+' : '') + fmtEuros(v, true);

export default function Renta() {
  const c = useColores();
  const { cliente } = useSesion();
  const [ano, setAno] = useState<string | null>(null);
  const [inf, setInf] = useState<InformeFiscal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compartiendo, setCompartiendo] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    cliente.fiscal(ano ?? undefined).then(
      (r) => vigente && (setError(null), setInf(r)),
      (e) => vigente && setError(e instanceof ErrorRumbo ? e.message : String(e)),
    );
    return () => {
      vigente = false;
    };
  }, [cliente, ano]);

  async function compartir() {
    if (!inf) return;
    setCompartiendo(true);
    try {
      await compartirTexto(`rumbo_renta_${inf.ano}.csv`, inf.csv);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompartiendo(false);
    }
  }

  const t = inf?.totales;
  const vacio = inf && !inf.ventas.length && !inf.cobros.length && !inf.rescates.length && !inf.comisiones.length && !inf.gastosAlquiler.length;

  return (
    <>
      <Stack.Screen options={{ title: 'Para la Renta' }} />
      <ScrollView contentContainerStyle={estilos.pagina}>
        <Text style={[estilos.aviso, { color: c.tinta2, borderColor: c.aviso }]}>
          <Text style={{ fontWeight: '700' }}>Orientativo, para repasar el borrador: no es asesoramiento fiscal.</Text> Ventas
          como Hacienda (FIFO; los traspasos entre fondos conservan coste y fecha). Rumbo no sabe tus retenciones ni tu
          situación: compáralo con los datos fiscales de tu banco.
        </Text>

        {error && <Text style={{ color: c.mal }}>{error}</Text>}
        {!inf && !error && <ActivityIndicator style={{ marginTop: 30 }} />}

        {inf && (
          <>
            <Chips opciones={(inf.anos.length ? inf.anos : [inf.ano]).slice(0, 6).map((a) => ({ id: a, et: a }))} activo={inf.ano} alCambiar={setAno} />

            {vacio ? (
              <Text style={{ color: c.tinta3 }}>
                En {inf.ano} no anotaste ventas, dividendos, intereses ni alquileres: no hay nada que declarar de tus inversiones ese año.
              </Text>
            ) : (
              <>
                <View style={estilos.cajas}>
                  <Caja c={c} titulo="Ganancias y pérdidas" valor={inf.ventas.length ? conSigno(t!.saldo) : '—'} color={inf.ventas.length ? colorSigno(t!.saldo, c) : undefined}
                    nota={!inf.ventas.length ? 'no vendiste nada este año' : `en ${inf.ventas.length} ${inf.ventas.length === 1 ? 'venta' : 'ventas'}`} />
                  {t!.dividendos ? <Caja c={c} titulo="Dividendos y cupones" valor={fmtEuros(t!.dividendos, true)} nota="como los anotaste" /> : null}
                  {t!.intereses ? <Caja c={c} titulo="Intereses" valor={fmtEuros(t!.intereses, true)} nota="de cuentas y P2P" /> : null}
                  {t!.alquileres || t!.gastosAlquiler ? (
                    <Caja c={c} titulo="Alquileres" valor={fmtEuros(t!.alquileres, true)} nota={t!.gastosAlquiler ? `${fmtEuros(t!.gastosAlquiler, true)} de gastos` : 'cobrados'} />
                  ) : null}
                  {t!.comisiones ? <Caja c={c} titulo="Comisiones aparte" valor={fmtEuros(t!.comisiones, true)} nota="custodia y otras" /> : null}
                </View>

                {inf.ventas.length > 0 && (
                  <Tarjeta c={c} titulo="Ventas">
                    {inf.ventas.map((v, i) => <FilaVenta key={i} v={v} c={c} />)}
                    <View style={[estilos.total, { borderColor: c.borde }]}>
                      <Text style={{ color: c.tinta, fontWeight: '700', flex: 1 }}>Total</Text>
                      <Text style={{ color: colorSigno(t!.saldo, c), fontWeight: '700' }}>{conSigno(t!.saldo)}</Text>
                    </View>
                    <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
                      Transmisión {fmtEuros(t!.transmision, true)} · adquisición {fmtEuros(t!.adquisicion, true)}
                    </Text>
                  </Tarjeta>
                )}

                {inf.cobros.length > 0 && (
                  <Tarjeta c={c} titulo="Dividendos, cupones, intereses y alquileres">
                    {inf.cobros.map((x) => (
                      <View key={x.producto} style={[estilos.fila, { borderColor: c.borde }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={1}>{x.nombre}</Text>
                          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{x.clase} · {x.cobros} {x.cobros === 1 ? 'cobro' : 'cobros'}</Text>
                        </View>
                        <Text style={{ color: c.tinta }}>{fmtEuros(x.importe, true)}</Text>
                      </View>
                    ))}
                  </Tarjeta>
                )}

                {inf.rescates.length > 0 && (
                  <Tarjeta c={c} titulo="Rescates de planes de pensiones">
                    {inf.rescates.map((v, i) => (
                      <View key={i} style={[estilos.fila, { borderColor: c.borde }]}>
                        <Text style={{ color: c.tinta, flex: 1 }} numberOfLines={1}>{v.nombre} · {fmtFecha(v.fecha)}</Text>
                        <Text style={{ color: c.tinta }}>{fmtEuros(v.transmision, true)}</Text>
                      </View>
                    ))}
                  </Tarjeta>
                )}

                <Boton texto="Compartir en CSV (para Excel)" alPulsar={compartir} ocupado={compartiendo} tipo="secundario" />
              </>
            )}

            {inf.avisos.map((a, i) => (
              <Text key={i} style={[estilos.pequeno, { color: c.aviso }]}>⚠ {a}</Text>
            ))}
          </>
        )}
        <PieCreditos />
      </ScrollView>
    </>
  );
}

function FilaVenta({ v, c }: { v: VentaFiscal; c: Colores }) {
  const fechas = [...new Set(v.compras.map((x) => x.fecha))].sort();
  const compradas = !fechas.length ? '—' : fechas.length === 1 ? fmtFecha(fechas[0])
    : `${fmtFecha(fechas[0])} a ${fmtFecha(fechas[fechas.length - 1])} (${fechas.length} compras)`;
  return (
    <View style={[estilos.fila, { borderColor: c.borde, alignItems: 'flex-start' }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.tinta, fontWeight: '600' }} numberOfLines={2}>{v.nombre}</Text>
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{[v.isin, v.tipo].filter(Boolean).join(' · ')}</Text>
        <Text style={[estilos.pequeno, { color: c.tinta2 }]}>
          Vendido el {fmtFecha(v.fecha)} por {fmtEuros(v.transmision, true)} · comprado {compradas}
          {v.adquisicion != null ? ` por ${fmtEuros(v.adquisicion, true)}` : ''}
        </Text>
        {v.avisos.map((a, i) => <Text key={i} style={[estilos.pequeno, { color: c.aviso }]}>⚠ {a}</Text>)}
      </View>
      <Text style={{ color: colorSigno(v.ganancia, c), fontWeight: '700' }}>{conSigno(v.ganancia)}</Text>
    </View>
  );
}

function Caja({ c, titulo, valor, nota, color }: { c: Colores; titulo: string; valor: string; nota: string; color?: string }) {
  return (
    <View style={[estilos.caja, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{titulo}</Text>
      <Text style={{ color: color ?? c.tinta, fontWeight: '800', fontSize: 18 }}>{valor}</Text>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{nota}</Text>
    </View>
  );
}

function Tarjeta({ c, titulo, children }: { c: Colores; titulo: string; children: React.ReactNode }) {
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <Text style={{ color: c.tinta, fontWeight: '700', fontSize: 16 }}>{titulo}</Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  aviso: { borderWidth: 1, borderRadius: RADIO, padding: 12, fontSize: 13, lineHeight: 19 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  cajas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  caja: { flexGrow: 1, flexBasis: 150, borderRadius: RADIO, borderWidth: 1, padding: 12, gap: 2 },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  total: { flexDirection: 'row', paddingTop: 8 },
});

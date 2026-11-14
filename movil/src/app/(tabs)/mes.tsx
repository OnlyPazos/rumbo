/**
 * El mes: la pestaña «El mes» del panel original de Rumbo (pintaMes en app/web/app.js).
 * Cuánto cambió tu patrimonio un mes, cuánto pusiste tú y cuánto el mercado, producto a producto,
 * y el histórico de los últimos 18 meses.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { PieCreditos } from '@/componentes/Creditos';
import { fmtEuros, fmtFecha, fmtPct } from '@/formato';
import { BarrasAgrupadas } from '@/graficos/BarrasAgrupadas';
import { etiquetaMes } from '@/graficos/escala';
import { usePanelAlEnfocar } from '@/sesion/panel';
import { RADIO, colorDe, colorSigno, colorSlot, useColores, type Colores } from '@/tema';

/** «+1.234 €» con signo, como fmtEurSigno de la web. */
const conSigno = (v: number) => (v > 0 ? '+' : '') + fmtEuros(v);

export default function Mes() {
  const c = useColores();
  const { panel, error } = usePanelAlEnfocar();
  const [elegido, setElegido] = useState<number | null>(null);

  const datos = panel?.datos;
  const rm = datos?.resumenMensual ?? [];
  if (error) return <Centro c={c}><Text style={{ color: c.mal, padding: 20 }}>{error}</Text></Centro>;
  if (!panel) return <Centro c={c}><ActivityIndicator /></Centro>;
  if (!datos || !rm.length) return <Centro c={c}><Text style={{ color: c.tinta3, padding: 20 }}>Aún no hay meses que enseñar.</Text></Centro>;

  const i = elegido == null || elegido >= rm.length ? rm.length - 1 : elegido;
  const r = rm[i];
  const ultimo = i === rm.length - 1;
  // El titular es el cambio real: lo que pusiste más lo que hizo el mercado. Una cuenta que
  // empieza a seguirse mueve el saldo pero no es dinero ganado: va aparte.
  const real = r.aportado + r.mercado;
  const productos = [...datos.productos, ...datos.otrosActivos, ...datos.pasivos];
  const filas = productos.map((p) => ({ p, d: r.porProducto[p.id] })).filter((x) => x.d);
  const ult = rm.slice(-18);

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <View style={estilos.selector}>
        <Flecha c={c} texto="‹" desactivada={i === 0} alPulsar={() => setElegido(i - 1)} />
        <Text style={[estilos.mes, { color: c.tinta }]}>{etiquetaMes(r.mes)}</Text>
        <Flecha c={c} texto="›" desactivada={ultimo} alPulsar={() => setElegido(i + 1)} />
      </View>

      <Tarjeta c={c}>
        <Text style={[estilos.etiqueta, { color: c.tinta3 }]}>{ultimo ? 'Cambio en lo que va de mes' : 'Cambio del mes'}</Text>
        <Text style={[estilos.cifra, { color: colorSigno(real, c) }]}>{conSigno(real)}</Text>
        <Text style={{ color: c.tinta2 }}>
          De {fmtEuros(r.inicio)} a {fmtEuros(r.fin)}
          {r.rentabilidad != null ? ` · rentabilidad de la cartera ${fmtPct(r.rentabilidad)}` : ''}
        </Text>
        {ultimo && <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Mes en curso, con datos hasta el {fmtFecha(datos.fechaExtracto)}.</Text>}
        {r.nuevo ? (
          <Text style={[estilos.pequeno, { color: c.tinta2 }]}>De la diferencia, {fmtEuros(r.nuevo)} son cuentas que entran al panel.</Text>
        ) : null}
      </Tarjeta>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Caja c={c} color={colorSlot(1, c)} titulo="Lo pusiste tú" valor={fmtEuros(r.aportado)} nota="aportaciones del mes" />
        <Caja c={c} color={colorSlot(3, c)} titulo="Lo puso el mercado" valor={conSigno(r.mercado)} nota="sin tocar nada" colorValor={colorSigno(r.mercado, c)} />
      </View>
      {r.nuevo ? (
        <Caja c={c} color={colorSlot(7, c)} titulo="Nuevo en el panel" valor={fmtEuros(r.nuevo)} nota="no es dinero nuevo: es que empiezas a seguirlo" />
      ) : null}

      <Tarjeta c={c}>
        <Text style={[estilos.titulo, { color: c.tinta }]}>Producto a producto</Text>
        {filas.map(({ p, d }) => (
          <View key={p.id} style={[estilos.fila, { borderColor: c.borde }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[estilos.punto, { backgroundColor: colorDe(p.slotColor, c) }]} />
              <Text style={{ color: c.tinta, fontWeight: '600', flex: 1 }} numberOfLines={1}>{p.corto || p.nombre}</Text>
              <Text style={{ color: colorSigno(d.fin - d.inicio, c), fontWeight: '700' }}>{conSigno(d.fin - d.inicio)}</Text>
            </View>
            <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
              {fmtEuros(d.inicio)} → {fmtEuros(d.fin)}
              {d.aportado ? ` · aportaste ${fmtEuros(d.aportado)}` : ''}
              {` · mercado ${conSigno(d.mercado)}`}
              {d.nuevo ? ` · entra al panel ${fmtEuros(d.nuevo)}` : ''}
            </Text>
          </View>
        ))}
      </Tarjeta>

      <Tarjeta c={c}>
        <Text style={[estilos.titulo, { color: c.tinta }]}>Tú y el mercado, mes a mes</Text>
        <BarrasAgrupadas
          c={c} categorias={ult.map((x) => x.mes)} etiqueta={etiquetaMes}
          formato={conSigno}
          series={[
            { nombre: 'Lo pusiste tú', color: colorSlot(1, c), valores: ult.map((x) => x.aportado) },
            { nombre: 'Lo puso el mercado', color: colorSlot(3, c), valores: ult.map((x) => x.mercado) },
          ]}
        />
      </Tarjeta>
      <PieCreditos />
    </ScrollView>
  );
}

function Flecha({ c, texto, desactivada, alPulsar }: { c: Colores; texto: string; desactivada: boolean; alPulsar: () => void }) {
  return (
    <Pressable onPress={alPulsar} disabled={desactivada} style={[estilos.flecha, { backgroundColor: c.sup2, opacity: desactivada ? 0.35 : 1 }]}>
      <Text style={{ color: c.tinta, fontSize: 22, lineHeight: 24 }}>{texto}</Text>
    </Pressable>
  );
}

function Caja({ c, color, titulo, valor, nota, colorValor }: { c: Colores; color: string; titulo: string; valor: string; nota: string; colorValor?: string }) {
  return (
    <View style={[estilos.caja, { backgroundColor: c.sup, borderColor: c.borde, borderLeftColor: color }]}>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{titulo}</Text>
      <Text style={{ color: colorValor ?? c.tinta, fontWeight: '800', fontSize: 20 }}>{valor}</Text>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{nota}</Text>
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
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mes: { fontSize: 18, fontWeight: '700' },
  flecha: { width: 44, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 6 },
  etiqueta: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  titulo: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cifra: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  caja: { flex: 1, borderRadius: RADIO, borderWidth: 1, borderLeftWidth: 4, padding: 12, gap: 2 },
  fila: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  punto: { width: 10, height: 10, borderRadius: 5 },
});

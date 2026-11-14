/**
 * Objetivo, fondo de emergencia y reparto objetivo en el panel, como en la pestaña «Patrimonio»
 * del panel original de Rumbo (pintaPatrimonio, pintaLiquidez y pintaReparto en app/web/app.js).
 * Las cuentas son las de app/web/calculos.js, portadas a src/calculos.ts con sus pruebas.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PanelDatos, ProductoCalculado } from '@/api/tipos';
import { filasReparto, gruposReparto, normalizaReparto, repartirAportacion, resumenLiquidez, siguienteMeta, type ColchonCalculado, type EstadoReparto } from '@/calculos';
import { fmtEuros, numEs } from '@/formato';
import { fmtEurCorto } from '@/graficos/escala';
import { RADIO, colorDe, type Colores } from '@/tema';

const pct0 = (x: number) => `${Math.round(x * 100)} %`;
const pct1 = (x: number) => `${x.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;

function Barra({ c, pct, color }: { c: Colores; pct: number; color?: string }) {
  return (
    <View style={[estilos.barra, { backgroundColor: c.sup3 }]}>
      <View style={{ width: `${Math.round(pct * 1000) / 10}%`, height: '100%', borderRadius: 4, backgroundColor: color ?? c.acento }} />
    </View>
  );
}

function Editar({ c, texto, ruta }: { c: Colores; texto: string; ruta: '/objetivo' | '/colchon' | '/reparto-objetivo' }) {
  return (
    <Pressable onPress={() => router.push(ruta)} hitSlop={8}>
      <Text style={{ color: c.acento, fontWeight: '600' }}>{texto}</Text>
    </Pressable>
  );
}

/** «62,4 % del camino hacia La entrada del piso (40k €) · faltan 15.000 €». */
export function ProgresoObjetivo({ datos, c, editable }: { datos: PanelDatos; c: Colores; editable: boolean }) {
  const objetivo = datos.objetivo as { activo?: boolean; importe?: number; etiqueta?: string } | null;
  const m = siguienteMeta(datos.total.patrimonio, objetivo, datos.total.hitos);
  if (!m) return null;
  const meta = m.etiqueta ? `${m.etiqueta} (${fmtEurCorto(m.importe)})` : fmtEurCorto(m.importe);
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      <Barra c={c} pct={m.pct} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <Text style={[estilos.pequeno, { color: c.tinta2, flex: 1 }]}>
          <Text style={{ color: c.tinta, fontWeight: '700' }}>{pct1(m.pct * 100)}</Text> del camino hacia {meta}
        </Text>
        <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Faltan {fmtEuros(m.falta)}</Text>
      </View>
      {editable && <Editar c={c} texto={objetivo ? 'Cambiar mi objetivo' : 'Ponerme un objetivo propio'} ruta="/objetivo" />}
    </View>
  );
}

/** Liquidez y fondo de emergencia. */
export function Liquidez({ datos, productos, c, editable }: { datos: PanelDatos; productos: ProductoCalculado[]; c: Colores; editable: boolean }) {
  const colchon = datos.colchon as ColchonCalculado | null;
  const R = resumenLiquidez(productos, colchon);
  if (!R.productos.length && !colchon) return null;
  const total = datos.total.patrimonio;
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.titulo, { color: c.tinta }]}>Liquidez y fondo de emergencia</Text>
        {editable && colchon && <Editar c={c} texto="Cambiar" ruta="/colchon" />}
      </View>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        {fmtEuros(R.liquidez)} disponibles en días · {pct0(total ? R.liquidez / total : 0)} de tu patrimonio
      </Text>
      {!colchon ? (
        <>
          <Text style={{ color: c.tinta2, lineHeight: 20 }}>
            ¿Cuánto quieres tener siempre a mano por si pasa algo? Dilo en meses de gastos (lo habitual es entre 3 y 6) y Rumbo
            te dirá si lo tienes cubierto y cuánto te sobra para invertir.
          </Text>
          {editable && <Editar c={c} texto="Definir mi fondo de emergencia" ruta="/colchon" />}
        </>
      ) : (
        <>
          <View style={estilos.cifras}>
            <Cifra c={c} titulo="Fondo de emergencia" valor={fmtEuros(R.objetivo)}
              nota={colchon.modo === 'meses' ? `${String(colchon.meses).replace('.', ',')} meses de ${fmtEuros(colchon.gastoMensual)}` : 'importe fijo'} />
            <Cifra c={c} titulo="Tienes en liquidez" valor={fmtEuros(R.liquidez)}
              nota={R.meses != null ? `te cubre ${R.meses.toLocaleString('es-ES', { maximumFractionDigits: 1 })} meses` : 'cuentas y monetarios'} />
          </View>
          <Text style={{ color: (R.sobra ?? 0) >= 0 ? c.bien : c.mal, fontWeight: '700' }}>
            {(R.sobra ?? 0) >= 0 ? `Disponible para invertir: ${fmtEuros(R.sobra)}` : `Te faltan ${fmtEuros(Math.abs(R.sobra ?? 0))} para completarlo`}
          </Text>
          <Barra c={c} pct={R.pct ?? 0} color={(R.pct ?? 0) >= 1 ? c.bien : c.aviso} />
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
            {pct0(R.pct ?? 0)} cubierto · {fmtEuros(R.cubierto)} de {fmtEuros(R.objetivo)}
          </Text>
        </>
      )}
      {R.productos.map((p) => (
        <View key={p.id} style={estilos.filaSimple}>
          <View style={[estilos.punto, { backgroundColor: colorDe(p.slotColor, c) }]} />
          <Text style={{ color: c.tinta2, flex: 1 }} numberOfLines={1}>{p.corto || p.nombre}</Text>
          <Text style={{ color: c.tinta2 }}>{fmtEuros(p.valor)}</Text>
        </View>
      ))}
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        Cuentan las cuentas y los fondos monetarios. Para cambiarlo: en la ficha del producto, «Editar» → «Cuenta como liquidez».
      </Text>
    </View>
  );
}

const ESTADOS: Record<EstadoReparto, string> = { ok: 'OK', vigilar: 'Vigilar', rebalancear: 'Rebalancear' };

/** Reparto objetivo: el semáforo de cada grupo y cómo repartir la próxima aportación sin vender. */
export function RepartoObjetivo({ datos, productos, c, editable }: { datos: PanelDatos; productos: ProductoCalculado[]; c: Colores; editable: boolean }) {
  const o = normalizaReparto(datos.objetivoReparto);
  const sugerido = Math.round((datos.total.ritmoMensual || 500) / 50) * 50 || 500;
  const [aporte, setAporte] = useState(String(sugerido));
  if (!o) {
    if (!editable) return null;
    return (
      <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
        <Text style={[estilos.titulo, { color: c.tinta }]}>Tu reparto objetivo</Text>
        <Text style={{ color: c.tinta2, lineHeight: 20 }}>
          Di qué porcentaje quieres en cada tipo de activo (por ejemplo, 80 % renta variable y 20 % renta fija) y Rumbo te
          avisará cuando te desvíes y te dirá dónde meter tu próxima aportación para volver a cuadrar, sin vender nada.
        </Text>
        <Editar c={c} texto="Definir mi reparto objetivo" ruta="/reparto-objetivo" />
      </View>
    );
  }
  const colorEstado: Record<EstadoReparto, string> = { ok: c.bien, vigilar: c.aviso, rebalancear: c.mal };
  const grupos = gruposReparto(productos, o, (p) => p.valor || 0, (p) => (p ? colorDe(p.slotColor, c) : c.tinta3));
  const { filas, peor } = filasReparto(grupos, o);
  const a = numEs(aporte) ?? 0;
  const reparto = repartirAportacion(filas, o.pesos, a);
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.sup, borderColor: c.borde }]}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.titulo, { color: c.tinta }]}>Tu reparto objetivo</Text>
        {editable && <Editar c={c} texto="Cambiar" ruta="/reparto-objetivo" />}
      </View>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
        {o.por === 'producto' ? 'Por producto' : 'Por tipo de activo'} · OK hasta {o.vigilar} puntos de desviación, rebalancear desde {o.rebalancear}
      </Text>
      {filas.map((f) => (
        <View key={f.nombre} style={[estilos.fila, { borderColor: c.borde }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[estilos.punto, { backgroundColor: f.color ?? c.tinta3 }]} />
            <Text style={{ color: c.tinta, fontWeight: '600', flex: 1 }} numberOfLines={1}>{f.nombre}</Text>
            <Text style={[estilos.estado, { color: colorEstado[f.estado], borderColor: colorEstado[f.estado] }]}>{ESTADOS[f.estado]}</Text>
          </View>
          <Text style={[estilos.pequeno, { color: c.tinta3 }]}>
            {`Ahora ${pct1(f.ahora)} · objetivo ${pct1(f.obj)} · ${f.desv >= 0 ? '+' : '−'}${Math.abs(f.desv).toLocaleString('es-ES', { maximumFractionDigits: 1 })} pts`}
            {Math.abs(f.cuadrar) >= 1 ? ` · para cuadrar ${f.cuadrar > 0 ? '+' : '−'}${fmtEuros(Math.abs(f.cuadrar))}` : ''}
          </Text>
          {o.por !== 'producto' && f.productos.length > 0 && (
            <Text style={[estilos.pequeno, { color: c.tinta3 }]} numberOfLines={1}>
              {f.productos.slice(0, 3).join(' · ')}{f.productos.length > 3 ? ` y ${f.productos.length - 3} más` : ''}
            </Text>
          )}
        </View>
      ))}
      <Text style={[estilos.pequeno, { color: c.tinta2 }]}>
        {peor && peor.estado !== 'ok'
          ? `Lo que más se ha desviado: ${peor.nombre} (${peor.desv >= 0 ? '+' : '−'}${Math.abs(peor.desv).toFixed(1).replace('.', ',')} puntos).`
          : 'Todo dentro del margen: no hace falta tocar nada.'}
      </Text>

      <View style={[estilos.calculo, { backgroundColor: c.sup2 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: c.tinta }}>Voy a aportar</Text>
          <TextInput
            value={aporte} onChangeText={setAporte} keyboardType="decimal-pad"
            style={[estilos.campo, { color: c.tinta, backgroundColor: c.sup, borderColor: c.borde }]}
          />
          <Text style={{ color: c.tinta }}>€</Text>
        </View>
        {a > 0 && (
          <>
            <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Así lo repartiría para acercarme al objetivo sin vender:</Text>
            {filas.map((f, i) => (reparto[i] >= 1 ? (
              <View key={f.nombre} style={estilos.filaSimple}>
                <View style={[estilos.punto, { backgroundColor: f.color ?? c.tinta3 }]} />
                <Text style={{ color: c.tinta, flex: 1 }} numberOfLines={1}>{f.nombre}</Text>
                <Text style={{ color: c.tinta, fontWeight: '700' }}>{fmtEuros(reparto[i])}</Text>
                <Text style={[estilos.pequeno, { color: c.tinta3, width: 40, textAlign: 'right' }]}>{pct0(reparto[i] / a)}</Text>
              </View>
            ) : null))}
          </>
        )}
      </View>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>Es una herramienta para pensar, no una recomendación de inversión.</Text>
    </View>
  );
}

function Cifra({ c, titulo, valor, nota }: { c: Colores; titulo: string; valor: string; nota: string }) {
  return (
    <View style={[estilos.cifra, { backgroundColor: c.sup2 }]}>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{titulo}</Text>
      <Text style={{ color: c.tinta, fontWeight: '800', fontSize: 18 }}>{valor}</Text>
      <Text style={[estilos.pequeno, { color: c.tinta3 }]}>{nota}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: RADIO, borderWidth: 1, padding: 16, gap: 8 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  titulo: { fontSize: 16, fontWeight: '700', flex: 1 },
  pequeno: { fontSize: 12, lineHeight: 17 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  cifras: { flexDirection: 'row', gap: 10 },
  cifra: { flex: 1, borderRadius: 12, padding: 12, gap: 2 },
  fila: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 3 },
  filaSimple: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  estado: { fontSize: 11, fontWeight: '700', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  calculo: { borderRadius: 12, padding: 12, gap: 6 },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 90, fontSize: 15 },
});

/**
 * «Compartir mi mes»: elige mes, formato y tema, y comparte la imagen (como la ventana de
 * app/web/compartir.js de Rumbo). Por defecto solo porcentajes: los euros salen si los activas.
 * En el móvil se captura con react-native-view-shot y se abre el menú de compartir; en web, el SVG
 * se pasa a PNG con un canvas y se descarga.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, PixelRatio, Platform, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';

import { resumenParaCompartir } from '@/calculos';
import { Boton, Chips } from '@/componentes/Formulario';
import { FORMATOS, ImagenMes, TEMAS, type Formato, type Tema } from '@/imagen/ImagenMes';
import { usePanel } from '@/sesion/panel';
import { useColores, type Colores } from '@/tema';

/** En web: el <svg> de la vista previa, a PNG de 1080 de ancho, y se descarga. */
async function descargarComoPng(contenedor: unknown, formato: Formato, nombre: string) {
  const svg = (contenedor as HTMLElement).querySelector('svg');
  if (!svg) throw new Error('No encuentro la imagen.');
  const { w, h } = FORMATOS[formato];
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute('width', String(w));
  copia.setAttribute('height', String(h));
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copia));
  await img.decode();
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  lienzo.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const blob: Blob = await new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No he podido crear la imagen.'))), 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function CompartirMes() {
  const c = useColores();
  const { panel } = usePanel();
  const { mes } = useLocalSearchParams<{ mes?: string }>();
  const { width } = useWindowDimensions();
  const [i, setI] = useState<number | null>(mes != null ? Number(mes) : null);
  const [formato, setFormato] = useState<Formato>('resumen');
  const [tema, setTema] = useState<Tema>('oscuro');
  const [euros, setEuros] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imagen = useRef<ComponentRef<typeof View>>(null);

  const datos = panel?.datos;
  if (!datos) return <View style={[estilos.centro, { backgroundColor: c.plano }]}><ActivityIndicator /></View>;
  const rm = datos.resumenMensual ?? [];
  const idx = i == null || !(i >= 0 && i < rm.length) ? rm.length - 1 : i;
  const d = resumenParaCompartir(datos, idx);
  if (!d) return <View style={[estilos.centro, { backgroundColor: c.plano }]}><Text style={{ color: c.tinta3 }}>Todavía no hay ningún mes que compartir.</Text></View>;

  const ancho = Math.min(width - 32, formato === 'story' ? 300 : 420);
  const nombre = `rumbo_${d.mes}_${formato}.png`;

  async function compartir() {
    setOcupado(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        await descargarComoPng(imagen.current, formato, nombre);
      } else {
        const { w, h } = FORMATOS[formato];
        // Tamaño de salida en puntos: 1080 px de ancho en cualquier pantalla.
        const uri = await captureRef(imagen, { format: 'png', result: 'tmpfile', width: w / PixelRatio.get(), height: h / PixelRatio.get() });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: nombre, UTI: 'public.png' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Compartir mi mes' }} />
      <ScrollView contentContainerStyle={estilos.pagina}>
        <View style={estilos.selector}>
          <Flecha c={c} texto="‹" desactivada={idx === 0} alPulsar={() => setI(idx - 1)} />
          <Text style={{ color: c.tinta, fontSize: 17, fontWeight: '700' }}>{d.etiqueta}</Text>
          <Flecha c={c} texto="›" desactivada={idx === rm.length - 1} alPulsar={() => setI(idx + 1)} />
        </View>
        <Chips opciones={(Object.keys(FORMATOS) as Formato[]).map((k) => ({ id: k, et: FORMATOS[k].nombre }))} activo={formato} alCambiar={setFormato} />
        <Chips opciones={(Object.keys(TEMAS) as Tema[]).map((k) => ({ id: k, et: TEMAS[k].nombre }))} activo={tema} alCambiar={setTema} />
        {formato === 'resumen' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.tinta, fontWeight: '600' }}>Mostrar euros</Text>
              <Text style={{ color: c.tinta3, fontSize: 12 }}>Apagado, solo porcentajes: nadie sabe cuánto tienes.</Text>
            </View>
            <Switch value={euros} onValueChange={setEuros} trackColor={{ true: c.acento, false: c.sup3 }} />
          </View>
        )}

        <View style={{ alignItems: 'center' }}>
          <View ref={imagen} collapsable={false} style={{ borderRadius: 8, overflow: 'hidden' }}>
            <ImagenMes datos={d} formato={formato} tema={tema} euros={euros} ancho={ancho} />
          </View>
        </View>

        {error && <Text style={{ color: c.mal }}>{error}</Text>}
        <Boton texto={Platform.OS === 'web' ? 'Descargar imagen' : 'Compartir imagen'} alPulsar={compartir} ocupado={ocupado} />
        <Text style={{ color: c.tinta3, fontSize: 12, lineHeight: 17 }}>
          {euros && formato === 'resumen'
            ? 'Ojo: con euros, quien la vea sabrá cuánto tienes.'
            : 'Solo porcentajes. El QR lleva a la página de Rumbo, de Dani Dominguez Quant, para descargarlo.'}
        </Text>
      </ScrollView>
    </>
  );
}

function Flecha({ c, texto, desactivada, alPulsar }: { c: Colores; texto: string; desactivada: boolean; alPulsar: () => void }) {
  return (
    <Pressable onPress={alPulsar} disabled={desactivada} style={[estilos.flecha, { backgroundColor: c.sup2, opacity: desactivada ? 0.35 : 1 }]}>
      <Text style={{ color: c.tinta, fontSize: 22, lineHeight: 24 }}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pagina: { padding: 16, gap: 14, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flecha: { width: 44, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

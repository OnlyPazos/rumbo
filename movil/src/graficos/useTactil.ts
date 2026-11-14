/**
 * Ver el valor de cada punto de un gráfico con el dedo, sin pelearse con el scroll de la página.
 *
 * Con react-native-gesture-handler la decisión se toma en nativo (no en JS, donde el scroll de iOS y
 * Android puede quitarle el dedo al gráfico aunque se le pida que no):
 *  - Arrastrar en horizontal: el gráfico se queda el gesto y enseña el valor bajo el dedo.
 *    Si el dedo se va en vertical antes, el gesto falla y la página se desplaza.
 *  - Tocar: enseña el valor de ese punto unos segundos.
 */
import { useEffect, useRef, useState } from 'react';
import { useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';

const SEGUNDOS_TOQUE = 3;

// ENJS: expo-router trae Reanimated, y con él gesture-handler ejecuta los callbacks como worklets en el
// hilo de la interfaz. Desde ahí no se puede llamar a setState (la app se cierra al arrastrar), así que
// se piden en el hilo de JavaScript con runOnJS.

export function useTactil(alMover: (x: number) => number | null) {
  const [indice, setIndice] = useState<number | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quitaReloj = () => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
  };
  useEffect(() => quitaReloj, []);

  const arrastre = usePanGesture({
    runOnJS: true,            // ver ENJS arriba
    activeOffsetX: [-6, 6],   // 6 puntos en horizontal: es del gráfico
    failOffsetY: [-10, 10],   // 10 en vertical antes: es scroll
    onActivate: (e) => {
      quitaReloj();
      setIndice(alMover(e.x));
    },
    onUpdate: (e) => setIndice(alMover(e.x)),
    onDeactivate: () => setIndice(null),
  });

  const toque = useTapGesture({
    runOnJS: true,
    onActivate: (e) => {
      quitaReloj();
      setIndice(alMover(e.x));
      reloj.current = setTimeout(() => setIndice(null), SEGUNDOS_TOQUE * 1000);
    },
  });

  return { indice, gesto: useCompetingGestures(arrastre, toque) };
}

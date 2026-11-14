/**
 * Tocar y arrastrar sobre un gráfico para ver el valor de cada punto, sin bloquear el scroll:
 * si el dedo se mueve más en vertical que en horizontal, la página sigue desplazándose.
 * Al levantar el dedo se quita el globo (como en las apps de bolsa).
 */
import { useRef, useState } from 'react';
import type { GestureResponderEvent, ViewProps } from 'react-native';

export function useTactil(alMover: (x: number) => number | null) {
  const [indice, setIndice] = useState<number | null>(null);
  const inicio = useRef({ x: 0, y: 0 });
  const arrastrando = useRef(false);

  const manejadores: ViewProps = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      inicio.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      arrastrando.current = false;
      setIndice(alMover(e.nativeEvent.locationX));
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const dx = Math.abs(e.nativeEvent.pageX - inicio.current.x);
      const dy = Math.abs(e.nativeEvent.pageY - inicio.current.y);
      if (dx > 6 && dx > dy) arrastrando.current = true;
      setIndice(alMover(e.nativeEvent.locationX));
    },
    // Mientras se arrastra en horizontal, el gráfico no suelta el dedo; si no, se lo queda el scroll.
    onResponderTerminationRequest: () => !arrastrando.current,
    onResponderTerminate: () => setIndice(null),
    onResponderRelease: () => {
      arrastrando.current = false;
      setIndice(null);
    },
  };

  return { indice, manejadores };
}

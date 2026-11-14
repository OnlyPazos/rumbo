/**
 * Los datos del panel (/api/panel), compartidos por las pestañas Panel, El mes y Rendimiento:
 * se piden una vez y cada pestaña los vuelve a pedir al enfocarse (tras anotar algo, cambian).
 */
import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { ErrorRumbo } from '@/api/cliente';
import type { RespuestaPanel } from '@/api/tipos';
import { useSesion } from './contexto';

interface DatosPanel {
  panel: RespuestaPanel | null;
  error: string | null;
  cargar: () => Promise<void>;
}

const ContextoPanel = createContext<DatosPanel | null>(null);

/** Va dentro de ProveedorSesion. Al cambiar de servidor, el padre le cambia la `key` y empieza de cero. */
export function ProveedorPanel({ children }: { children: ReactNode }) {
  const { cliente } = useSesion();
  const [panel, setPanel] = useState<RespuestaPanel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    try {
      const r = await cliente.cargarPanel();
      setError(null);
      setPanel(r);
    } catch (e) {
      setError(e instanceof ErrorRumbo ? e.message : String(e));
    }
  }, [cliente]);

  return <ContextoPanel.Provider value={{ panel, error, cargar }}>{children}</ContextoPanel.Provider>;
}

export function usePanel() {
  const p = useContext(ContextoPanel);
  if (!p) throw new Error('usePanel necesita <ProveedorPanel>');
  return p;
}

/** usePanel() y además recarga cada vez que la pantalla se enfoca. */
export function usePanelAlEnfocar() {
  const p = usePanel();
  const { cargar } = p;
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );
  return p;
}

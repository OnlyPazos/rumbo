import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ClienteRumbo, type Conexion } from '@/api/cliente';
import { guardaConexion, leeConexion } from './guardado';

interface Sesion {
  /** true mientras se lee la conexión guardada al arrancar. */
  cargando: boolean;
  conexion: Conexion | null;
  cliente: ClienteRumbo | null;
  conectar: (c: Conexion) => Promise<void>;
  desconectar: () => Promise<void>;
}

const ContextoSesion = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [conexion, setConexion] = useState<Conexion | null>(null);

  useEffect(() => {
    leeConexion().then((c) => {
      setConexion(c);
      setCargando(false);
    });
  }, []);

  const conectar = useCallback(async (c: Conexion) => {
    await guardaConexion(c);
    setConexion(c);
  }, []);

  const desconectar = useCallback(async () => {
    await guardaConexion(null);
    setConexion(null);
  }, []);

  const cliente = useMemo(() => (conexion ? new ClienteRumbo(conexion) : null), [conexion]);

  return (
    <ContextoSesion.Provider value={{ cargando, conexion, cliente, conectar, desconectar }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion() {
  const s = useContext(ContextoSesion);
  if (!s) throw new Error('useSesion necesita <ProveedorSesion>');
  return s;
}

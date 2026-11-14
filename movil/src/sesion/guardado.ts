/**
 * Dónde se guarda la conexión (dirección + llave): en el llavero del sistema en iOS y Android
 * (expo-secure-store) y en localStorage en web, que no tiene llavero.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Conexion } from '@/api/cliente';

const CLAVE = 'rumbo.conexion';

export async function leeConexion(): Promise<Conexion | null> {
  try {
    const texto = Platform.OS === 'web' ? globalThis.localStorage?.getItem(CLAVE) : await SecureStore.getItemAsync(CLAVE);
    const c = texto ? JSON.parse(texto) : null;
    return c && typeof c.servidor === 'string' && typeof c.llave === 'string' ? c : null;
  } catch {
    return null;
  }
}

export async function guardaConexion(c: Conexion | null) {
  try {
    if (Platform.OS === 'web') {
      if (c) globalThis.localStorage?.setItem(CLAVE, JSON.stringify(c));
      else globalThis.localStorage?.removeItem(CLAVE);
    } else if (c) {
      await SecureStore.setItemAsync(CLAVE, JSON.stringify(c));
    } else {
      await SecureStore.deleteItemAsync(CLAVE);
    }
  } catch {
    // Sin almacenamiento (navegación privada…): la conexión dura lo que la sesión.
  }
}

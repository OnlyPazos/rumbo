/**
 * Guardar o compartir un archivo de texto (el CSV para la Renta…): en el móvil se escribe en la caché y
 * se abre el menú de compartir del sistema; en web se descarga, como en el panel original.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function compartirTexto(nombre: string, contenido: string, mime = 'text/csv') {
  // La marca BOM hace que Excel lea bien los acentos (la web de Rumbo hace lo mismo).
  const texto = mime === 'text/csv' ? '﻿' + contenido : contenido;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([texto], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  await archivo.write(texto);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  await Sharing.shareAsync(archivo.uri, { mimeType: mime, dialogTitle: nombre, UTI: mime === 'text/csv' ? 'public.comma-separated-values-text' : undefined });
}

/**
 * Descarga un archivo de Rumbo (con la llave en la cabecera) y lo comparte: en el móvil, al menú de
 * compartir del sistema (para guardarlo en Archivos, mandarlo por correo…); en web, como descarga.
 */
export async function compartirDescarga(peticion: { url: string; headers: Record<string, string> }, nombre: string, mime: string) {
  if (Platform.OS === 'web') {
    const r = await fetch(peticion.url, { headers: peticion.headers });
    if (!r.ok) throw new Error(await mensajeDeError(r));
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  const archivo = await File.downloadFileAsync(peticion.url, new File(Paths.cache, nombre), { headers: peticion.headers, idempotent: true });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  await Sharing.shareAsync(archivo.uri, { mimeType: mime, dialogTitle: nombre });
}

async function mensajeDeError(r: Response) {
  try {
    const j = await r.json();
    return (j.errores ?? [j.error]).filter(Boolean).join(' ') || `Error ${r.status}`;
  } catch {
    return `Error ${r.status}`;
  }
}

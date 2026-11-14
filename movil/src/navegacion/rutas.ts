import type { Href } from 'expo-router';

/**
 * La pestaña Panel. En tiempo de ejecución es «/», pero los tipos que genera expo-router para
 * (tabs)/index la llaman «/(tabs)/index» o «/index», así que se declara una vez aquí.
 */
export const INICIO = '/' as Href;

/// <reference types="node" />
/** Pruebas de los cálculos de los gráficos. `npm test` (node --test, sin Jest). */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  aPorcentajes, acumula, arcoDonut, desdeIdx, escalaBonita, etiquetaEjeX, fmtEurCorto, indiceEn, indicesEjeX, lineasRejilla,
  trazado, tuDineroYMercado,
} from '../src/graficos/escala.ts';

test('escala bonita: cifras redondas que cubren el máximo', () => {
  assert.deepEqual(escalaBonita(57681), { max: 60000, min: 0, paso: 20000 });
  assert.deepEqual(escalaBonita(950), { max: 1000, min: 0, paso: 250 });
  const e = escalaBonita(0);   // sin datos no revienta
  assert.ok(e.max > e.min);
  assert.deepEqual(lineasRejilla({ max: 60000, min: 0, paso: 20000 }), [0, 20000, 40000, 60000]);
});

test('etiquetas del eje X', () => {
  assert.deepEqual(indicesEjeX(747, 4), [0, 249, 497, 746]);
  assert.deepEqual(indicesEjeX(1, 4), [0]);
  assert.equal(etiquetaEjeX('2026-09-13', 747), 'sep 26');
  assert.equal(etiquetaEjeX('2026-09-13', 30), '13 sep');
});

test('euros cortos como en la web', () => {
  assert.equal(fmtEurCorto(950), '950 €');
  assert.equal(fmtEurCorto(12500), '12,5k €');
  assert.equal(fmtEurCorto(1_250_000), '1,25 M€');
  assert.equal(fmtEurCorto(null), '—');
});

test('periodos: desde qué día se dibuja', () => {
  const fechas = Array.from({ length: 400 }, (_, i) => new Date(Date.UTC(2025, 7, 10 + i)).toISOString().slice(0, 10));
  const fin = fechas[fechas.length - 1];
  assert.equal(desdeIdx(fechas, fin, 'todo'), 0);
  assert.equal(desdeIdx(fechas, fin, '1m'), 399 - 30);
  assert.equal(desdeIdx(fechas, fin, '1a'), 399 - 365);
  assert.equal(fechas[desdeIdx(fechas, fin, 'ytd')], fin.slice(0, 4) + '-01-01');
  assert.equal(desdeIdx(fechas.slice(0, 5), fechas[4], '1a'), 0);   // historia más corta que el rango
});

test('trazado con huecos', () => {
  const r = trazado([null, 1, 2, null, 4], (i) => i * 10, (v) => v);
  assert.equal(r.d, 'M10.0 1.0 L20.0 2.0 M40.0 4.0');
  assert.equal(r.primero, 1);
  assert.equal(r.ultimo, 4);
  assert.equal(trazado([null, null], (i) => i, (v) => v).d, '');
});

test('donut: un solo grupo (360°) sigue dibujándose', () => {
  const d = arcoDonut(100, 100, 90, 55, -Math.PI / 2, (3 * Math.PI) / 2);
  assert.match(d, /^M.* A90 90 0 1 1 .* Z$/);
  assert.ok(!d.includes('NaN'));
});

test('punto bajo el dedo', () => {
  assert.equal(indiceEn(62, 62, 300, 100), 0);
  assert.equal(indiceEn(362, 62, 300, 100), 99);
  assert.equal(indiceEn(1000, 62, 300, 100), 99);   // fuera por la derecha
  assert.equal(indiceEn(0, 62, 300, 100), 0);
});

test('apilado: cada serie sobre las anteriores', () => {
  assert.deepEqual(acumula([[1, 2, null], [10, null, 30]], 3), [[1, 2, 0], [11, 2, 30]]);
  assert.deepEqual(acumula([], 3), []);
});

test('tu dinero y el mercado', () => {
  const r = tuDineroYMercado([100, 120, 90], [100, 100, 100]);
  assert.deepEqual(r.tuyo, [100, 100, 90]);
  assert.deepEqual(r.mercado, [0, 20, 0]);
  assert.equal(r.bajoCoste, true);
  assert.equal(tuDineroYMercado([100, 120], [100, 100]).bajoCoste, false);
});

test('reparto en %: suma 100 cada día (o 0 si no hay nada)', () => {
  const p = aPorcentajes([[1, 0, 3], [3, 0, 1]], 3);
  assert.deepEqual(p, [[25, 0, 75], [75, 0, 25]]);
});

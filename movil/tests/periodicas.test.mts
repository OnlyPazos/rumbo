/// <reference types="node" />
/** Las mismas pruebas que tests/js/calculos.test.js de Rumbo para periodicasPendientes. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { periodicasPendientes } from '../src/periodicas.ts';

test('aportaciones periódicas: avisa de las que faltan desde la última', () => {
  const ids = ['a', 'b'];
  const lista = [
    { producto: 'a', importe: 200, dia: 5, ultima: '2026-08-05' },     // faltan sep y oct
    { producto: 'b', importe: 50, dia: 31, ultima: '2026-01-31' },     // meses cortos: el último día
    { producto: 'zz', importe: 10, dia: 1, ultima: '2026-01-01' },     // producto borrado: nada
    { producto: 'a', importe: 10, dia: 20, ultima: '2026-09-20' },     // la de octubre aún no toca
  ];
  const p = periodicasPendientes(lista, ids, '2026-10-16');
  assert.deepEqual(p[0], { producto: 'a', importe: 200, dia: 5, desde: '2026-09-05', cuantas: 2 });
  assert.equal(p[1].desde, '2026-02-28');
  assert.equal(p[1].cuantas, 8);                                       // feb a sep (el 31-oct aún no)
  assert.equal(p.length, 2);
  assert.deepEqual(periodicasPendientes(undefined, ids, '2026-10-16'), []);
  assert.deepEqual(periodicasPendientes([{ producto: 'a', dia: 5, ultima: '<script>' }], ids, '2026-10-16'), []);
});

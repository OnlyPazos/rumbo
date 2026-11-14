/// <reference types="node" />
/** Pruebas de los formatos de los formularios. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fechaDesdeTexto, fmtFecha, numEs } from '../src/formato.ts';

test('numEs entiende lo mismo que num_es del backend', () => {
  // Los mismos casos que se comprueban contra app/motor.py.
  assert.equal(numEs('1.234,56'), 1234.56);
  assert.equal(numEs('1234,5'), 1234.5);
  assert.equal(numEs('12.5'), 12.5);
  assert.equal(numEs('1.000'), 1000);
  assert.equal(numEs('0,001234'), 0.001234);
  assert.equal(numEs('100 €'), 100);
  assert.equal(numEs(''), null);
  assert.equal(numEs('abc'), null);
  assert.equal(numEs('1,2,3'), null);
});

test('fechas escritas a mano', () => {
  assert.equal(fechaDesdeTexto('13/9/2026'), '2026-09-13');
  assert.equal(fechaDesdeTexto('13/09/26'), '2026-09-13');
  assert.equal(fechaDesdeTexto('1-2-2025'), '2025-02-01');
  assert.equal(fechaDesdeTexto('2026-09-13'), '2026-09-13');
  assert.equal(fechaDesdeTexto('31/02/2026'), null);   // no existe
  assert.equal(fechaDesdeTexto('mañana'), null);
  assert.equal(fmtFecha('2026-09-13'), '13/09/2026');
});

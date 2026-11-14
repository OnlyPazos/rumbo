/// <reference types="node" />
/**
 * Las mismas pruebas que tests/js/calculos.test.js de Rumbo (liquidez y reparto objetivo),
 * copiadas tal cual contra el port en TypeScript (src/calculos.ts). Y las del objetivo.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as C from '../src/calculos.ts';

const cerca = (a: number | null, b: number, tol = 0.01) => assert.ok(Math.abs((a as number) - b) <= tol, `${a} no está cerca de ${b}`);

test("países y sectores: cada producto pesa lo que vale, y solo su parte en bolsa", () => {
  const prods: C.ProductoParaCalculo[] = [
    { valor: 6000, exposicion: { rv: 1, paises: [["Estados Unidos", 70], ["Japón", 30]], sectores: [["Tecnología", 100]] } },
    { valor: 4000, exposicion: { rv: 0.5, paises: [["Japón", 100]], sectores: [["Salud", 100]] } },   // mixto
    { valor: 1000, tipoClave: "efectivo" },                                                           // cuenta
    { valor: 500, tipoClave: "pension", corto: "Plan" },                                              // sin datos
    { valor: 0, exposicion: { paises: [["China", 100]], sectores: [] } },                              // vendido
  ];
  const r = C.agregaExposicion(prods);
  assert.equal(r.enBolsa, 8000);
  assert.equal(r.fuera, 3000);                       // 2.000 de renta fija del mixto + la cuenta
  assert.equal(r.sinDatos, 500);
  assert.deepEqual(r.sinNombre, ["Plan"]);
  assert.deepEqual(r.paises, [["Estados Unidos", 52.5], ["Japón", 47.5]]);
  assert.deepEqual(r.sectores, [["Tecnología", 75], ["Salud", 25]]);
});

test("países: los 9 mayores y el resto en «Otros» (también el «Resto» de las fichas)", () => {
  // 12 países que suman 100 % (como las fichas de Morningstar) y un «Resto» vacío.
  const paises: [string, number][] = Array.from({ length: 12 }, (_, i): [string, number] => ["P" + i, (12 - i) * 100 / 78]).concat([["Resto", 0]]);
  const r = C.agregaExposicion([{ valor: 1000, exposicion: { paises, sectores: [] } }]);
  assert.equal(r.paises.length, 10);
  assert.equal(r.paises[9][0], "Otros");
  cerca(r.paises.reduce((a, x) => a + x[1], 0), 100, 0.3);
  assert.deepEqual(C.agregaExposicion([{ valor: 100, tipoClave: "cripto" }]).paises, []);
});

test("liquidez: cuentas y monetarios, o lo que marques", () => {
  assert.ok(C.esLiquidez({ tipoClave: "efectivo" }));
  assert.ok(C.esLiquidez({ tipoClave: "fondo", clase: "Mercado Monetario Corto Plazo EUR" }));
  assert.ok(!C.esLiquidez({ tipoClave: "fondo", clase: "RV Global" }));
  assert.ok(!C.esLiquidez({ tipoClave: "efectivo", liquidez: false }));   // lo que dice el usuario manda
  assert.ok(C.esLiquidez({ tipoClave: "fondo", liquidez: true }));
  const prods = [{ tipoClave: "efectivo", valor: 2500 }, { tipoClave: "fondo", clase: "Monetario", valor: 7400 },
    { tipoClave: "fondo", valor: 30000 }, { tipoClave: "efectivo", valor: 0 }];
  const r = C.resumenLiquidez(prods, { modo: "meses", meses: 6, gastoMensual: 1500, importe: 9000 });
  assert.equal(r.liquidez, 9900);
  assert.equal(r.productos.length, 2);
  assert.equal(r.productos[0].valor, 7400);           // de mayor a menor
  assert.equal(r.sobra, 900);
  cerca(r.meses, 6.6);
  assert.equal(r.pct, 1);
  const corto = C.resumenLiquidez(prods, { modo: "importe", importe: 20000 });
  assert.equal(corto.sobra, -10100);                  // le falta para completarlo
  assert.equal(corto.meses, null);
  cerca(corto.pct, 0.495);
  assert.equal(C.resumenLiquidez(prods, null).objetivo, null);
});

const RV = "Renta variable", RF = "Renta fija";
const O: C.Reparto = { por: "clase", pesos: { [RV]: 80, [RF]: 20 }, vigilar: 3, rebalancear: 5, conEfectivo: false };
const CARTERA = [
  { clase: "RV Global Cap. Grande Blend", valor: 6000, tipoClave: "fondo" },
  { clase: "RV Global Emergente", valor: 2000, tipoClave: "fondo" },
  { valor: 500, tipoClave: "accion", clase: "Renta variable" },
  { clase: "RF Diversificada EUR", valor: 1500, tipoClave: "fondo" },
  { clase: "Efectivo", valor: 5000, tipoClave: "efectivo" },                           // no cuenta: sin %
  { clase: "RV Global", valor: 999, tipoClave: "fondo", largoPlazo: false },           // no cuenta
];

test("reparto objetivo: grupos, desviación y semáforo", () => {
  const grupos = C.gruposReparto(CARTERA, O);
  assert.deepEqual(grupos.map(g => [g.nombre, g.valor]), [[RV, 8500], [RF, 1500]]);   // toda la bolsa junta
  assert.equal(grupos[0].productos.length, 3);
  const { total, filas, peor } = C.filasReparto(grupos, O);
  assert.equal(total, 10000);
  assert.deepEqual(filas.map(f => f.nombre), [RV, RF]);
  cerca(filas[0].desv, 5);
  assert.equal(filas[0].estado, "vigilar");           // 5 puntos: aún «vigilar»
  cerca(filas[1].cuadrar, 500);
  assert.equal(peor!.nombre, RV);
  const mucho = C.filasReparto(C.gruposReparto([{ clase: "RV", valor: 9000 }, { clase: "RF", valor: 1000 }], O), O);
  assert.equal(mucho.filas[0].estado, "rebalancear");
  const conCuentas = C.gruposReparto(CARTERA, { ...O, conEfectivo: true });
  assert.ok(conCuentas.some(g => g.nombre === "Efectivo"));
  const falta = C.gruposReparto([{ clase: "RV", valor: 100 }], O);
  assert.deepEqual(falta.map(g => [g.nombre, g.valor]), [[RV, 100], [RF, 0]]);   // el que aún no tienes, a 0
});

test("reparto objetivo: lo que eliges a mano manda sobre la regla general", () => {
  const lista = [
    { id: "w", corto: "World", clase: "RV Global", valor: 800, tipoClave: "fondo" },
    { id: "b", corto: "Bitcoin", valor: 100, tipoClave: "cripto" },
    { id: "m", corto: "Monetario", clase: "Monetario EUR", valor: 300, tipoClave: "fondo", largoPlazo: false },
    { id: "c", corto: "Cuenta", valor: 500, tipoClave: "efectivo" },
    { id: "d", corto: "Hipoteca", valor: 900, tipoClave: "deuda" },
  ];
  const o: C.Reparto = { por: "clase", pesos: { [RV]: 90, Monetario: 10 }, vigilar: 3, rebalancear: 5,
    cuenta: { b: false, m: true, d: true } };
  assert.equal(C.cuentaPorDefecto(lista[1], o), true);       // la regla general sí la contaría
  assert.equal(C.cuentaEnReparto(lista[1], o), false);       // pero la has quitado
  assert.equal(C.cuentaEnReparto(lista[2], o), true);        // el monetario a corto plazo, metido a mano
  assert.equal(C.cuentaEnReparto(lista[3], o), false);       // la cuenta: sin % y sin elegirla
  assert.equal(C.cuentaEnReparto(lista[4], o), false);       // las deudas nunca
  assert.deepEqual(C.gruposReparto(lista, o).map(g => [g.nombre, g.valor]), [[RV, 800], ["Monetario", 300]]);
});

test("reparto objetivo: tipos de activo sencillos", () => {
  const t = (p: C.ProductoParaCalculo) => C.tipoReparto(p);
  assert.equal(t({ tipoClave: "fondo", clase: "Mercado Monetario Corto Plazo EUR" }), "Monetario");
  assert.equal(t({ tipoClave: "fondo", clase: "RF Bonos Gobierno EUR" }), RF);
  assert.equal(t({ tipoClave: "fondo", clase: "Mixtos Moderados EUR" }), "Mixtos");
  assert.equal(t({ tipoClave: "etf", clase: "Global Large-Cap Blend Equity" }), RV);
  assert.equal(t({ tipoClave: "etf" }), RV);
  assert.equal(t({ tipoClave: "cripto", clase: "Criptoactivos" }), "Criptoactivos");
  assert.equal(t({ tipoClave: "efectivo", clase: "Efectivo" }), "Efectivo");
  assert.equal(t({ tipoClave: "pension", clase: "Jubilación" }), "Planes de pensiones");
  assert.equal(t({ tipoClave: "pension", clase: "RV Global Cap. Grande Blend" }), RV);
  assert.equal(t({ tipoClave: "fondo", clase: "Fondos" }), "Otros");
});

test("reparto objetivo: uno guardado por categoría se suma en su tipo, y el efectivo con % cuenta", () => {
  const viejo: C.Reparto = { por: "clase", vigilar: 3, rebalancear: 5, conEfectivo: false,
    pesos: { "RV Global Cap. Grande Blend": 60, "RV Global Emergente": 20, "Mercado Monetario Corto Plazo EUR": 10, Efectivo: 10 } };
  const o = C.normalizaReparto(viejo);
  assert.deepEqual(o.pesos, { [RV]: 80, Monetario: 10, Efectivo: 10 });
  assert.equal(o.conEfectivo, true);
  const g = C.gruposReparto([...CARTERA, { clase: "Mercado Monetario Corto Plazo EUR", valor: 1000, tipoClave: "fondo" }], viejo);
  assert.deepEqual(g.map(x => [x.nombre, x.valor]).sort(), [["Efectivo", 5000], ["Monetario", 1000], [RF, 1500], [RV, 9499]].sort());
  // Por producto no se toca; y una cuenta con % cuenta, sin % no.
  const porProd: C.Reparto = { por: "producto", pesos: { Cuenta: 10, World: 90 }, vigilar: 3, rebalancear: 5 };
  assert.equal(C.normalizaReparto(porProd), porProd);
  const lista = [{ corto: "World", valor: 900, tipoClave: "fondo" }, { corto: "Cuenta", valor: 100, tipoClave: "efectivo" },
    { corto: "Otra", valor: 50, tipoClave: "efectivo" }];
  assert.deepEqual(C.gruposReparto(lista, porProd).map(x => x.nombre).sort(), ["Cuenta", "World"]);
});

test("reparto objetivo: la aportación va a lo que falta, sin vender", () => {
  const grupos = [{ nombre: RV, valor: 8500 }, { nombre: RF, valor: 1500 }];
  // Con 500 €: el objetivo de RF es 20 % de 10.500 = 2.100 → le faltan 600; todo a RF.
  const r = C.repartirAportacion(grupos, O.pesos, 500);
  cerca(r[0], 0); cerca(r[1], 500);
  // Con 5.000 €: total 15.000 → RV 12.000 (faltan 3.500), RF 3.000 (faltan 1.500): justo cuadra.
  const r2 = C.repartirAportacion(grupos, O.pesos, 5000);
  cerca(r2[0], 3500); cerca(r2[1], 1500);
  // Si sobra después de cuadrar, el resto va según el objetivo; siempre suma lo aportado.
  const r3 = C.repartirAportacion([{ nombre: RV, valor: 800 }, { nombre: RF, valor: 200 }], O.pesos, 1000);
  cerca(r3[0], 800); cerca(r3[1], 200);
  for (const a of [1, 333, 1900, 25000]) cerca(C.repartirAportacion(grupos, O.pesos, a).reduce((x, y) => x + y, 0), a);
  assert.deepEqual(C.repartirAportacion(grupos, O.pesos, 0), [0, 0]);
  assert.deepEqual(C.repartirAportacion(grupos, O.pesos, NaN), [0, 0]);
});

test('objetivo: el propio si aún no lo alcanzas; si no, el siguiente hito', () => {
  const hitos = [{ importe: 10000 }, { importe: 25000 }, { importe: 50000 }];
  const propio = { activo: true, importe: 40000, etiqueta: 'La entrada del piso' };
  const m = C.siguienteMeta(30000, propio, hitos)!;
  assert.equal(m.importe, 40000);
  assert.equal(m.etiqueta, 'La entrada del piso');
  cerca(m.pct, 0.75);
  assert.equal(m.falta, 10000);
  assert.equal(C.siguienteMeta(45000, propio, hitos)!.importe, 50000);     // ya alcanzado: el siguiente hito
  assert.equal(C.siguienteMeta(45000, propio, hitos)!.etiqueta, null);
  assert.equal(C.siguienteMeta(30000, { activo: false, importe: 40000 }, hitos)!.importe, 50000);
  assert.equal(C.siguienteMeta(60000, null, hitos), null);                  // ni objetivo ni hitos por delante
});

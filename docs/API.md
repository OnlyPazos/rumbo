# API de Rumbo

Inventario de la API HTTP del backend de **[Rumbo](https://github.com/danidm98/rumbo)**, de **Dani Dominguez Quant**
(`app/servidor.py`). Lo usa la app de Expo de este fork (`movil/`); los tipos en TypeScript están en
[`movil/src/api/tipos.ts`](../movil/src/api/tipos.ts) y el cliente en [`movil/src/api/cliente.ts`](../movil/src/api/cliente.ts).

## Autenticación

| Quién | Cómo manda la llave | Comprobaciones extra |
|---|---|---|
| Panel web original | Cookie `rumbo_acceso` (la pone `/?acceso=<llave>`) | `Sec-Fetch-Site` / `Origin` deben ser de la propia app; CSP |
| App de Expo (fork) | Cabecera `Authorization: Bearer <llave>` | Ninguna: un navegador no añade esa cabecera solo, así que otra web no puede usarla |

- La llave está en `mis_datos/.acceso` (y Rumbo la imprime al arrancar en Docker).
- La dirección (`Host`) debe ser local, una IP privada o de Tailscale (con Docker / `PATRIMONIO_HOST=0.0.0.0`),
  o estar en `PATRIMONIO_HOSTS_PERMITIDOS`. Aplica a las dos formas de entrar.
- **CORS** (solo para la versión web de Expo servida desde otra dirección, p. ej. `expo start --web` en
  `http://localhost:8081`): `PATRIMONIO_ORIGENES_APP=http://localhost:8081` (separados por comas). Sin esa variable
  no hay CORS. La app nativa no lo necesita.
- Peticiones que cambian datos: cabecera `X-Rumbo-Perfil: <id>` con el perfil que se está viendo. Si no coincide
  con el activo, `409 {perfilCambiado: true}` y no se guarda nada.

## Formato de las respuestas

- Éxito: JSON; muchas incluyen `ok: true`.
- Error: `{"ok": false, "errores": ["mensaje para la persona", …]}` (a veces `error`), con 400/403/404/409/500.
- En la cartera de ejemplo (`modo: "demo"`) y en «Todos juntos» (`modo: "todos"`), lo que escribe devuelve 403.
- Las respuestas de cambios (`cambia()` en el servidor) devuelven `{ok, item, cartera, avisos}` y ya dejan el
  panel recalculado.

## Endpoints

### Panel y cartera

| Método | Ruta | Entrada | Salida |
|---|---|---|---|
| GET | `/api/ping` | — (sin llave) | `{app: "patrimonio"}` |
| GET | `/movil` *(fork)* | — (con la cookie del panel web) | Página HTML con el QR para conectar la app (dirección + llave) |
| GET | `/api/panel` *(fork)* | — | `{datos: PanelDatos \| null, perfiles: InfoPerfiles}` (`datos` es null con la cartera vacía) |
| GET | `/datos.js` | — | Lo mismo como JS (`window.DATOS`, `window.PERFILES`): solo para el panel web |
| GET | `/api/cartera` | — | `{modo, cartera, tipos, fuentes, tiposMovimiento}` |
| POST | `/api/actualizar` | — | `{ok, avisos}`: descarga precios y recalcula (segundos) |
| POST | `/api/empezar` | `{desde: "vacia" \| "ejemplo"}` | `{ok}`: sale de la demo |
| POST | `/api/reiniciar` | `{a: "vacia" \| "demo"}` | `{ok}`: lo anterior queda en copias |

### Productos, movimientos y valores

| Método | Ruta | Entrada | Notas |
|---|---|---|---|
| POST | `/api/productos` | `Producto` (con `id` para editar) | Comprueba que el código tiene precio en la fuente |
| POST | `/api/movimientos` | `Movimiento` (+ `moneda` opcional) | Otra moneda → se pasa a euros con el cambio del día; `traspaso` y `ajuste` tienen campos propios |
| POST | `/api/valoraciones` | `{producto, fecha, valor, aportado?}` | Uno por producto y día (sustituye) |
| DELETE | `/api/{productos\|movimientos\|valoraciones}/<id>` | — | |
| POST | `/api/objetivo` | `{activo, importe, etiqueta}` | |
| POST | `/api/colchon` | `{modo:"meses", meses, gastoMensual}` \| `{modo:"importe", importe}` \| `{borrar:true}` | |
| POST | `/api/reparto` | `{por, pesos, vigilar, rebalancear, conEfectivo, cuenta?}` \| `{borrar:true}` | Pesos suman 100 |
| POST | `/api/repartir-colores` | — | |

### Ayudas para formularios

| Método | Ruta | Entrada | Salida |
|---|---|---|---|
| GET | `/api/buscar` | `?q=` | `{resultados: ResultadoBusqueda[], sinConexion}` |
| GET | `/api/cambio` | `?moneda=USD&fecha=` | `{ok, cambio}` (euros por unidad) |
| GET | `/api/unidades` | `?producto=&fecha=&excluir=` | `{ok, unidades}` |
| GET | `/api/precio` | `?producto=&fecha=` | `{ok, precio, fecha}` |

### Aportaciones periódicas, Renta e importar

| Método | Ruta | Entrada | Salida |
|---|---|---|---|
| POST | `/api/periodicas/ver` | plan | `{ok, plan}` (no guarda) |
| POST | `/api/periodicas/crear` | plan | respuesta de cambio |
| POST | `/api/periodicas/olvidar` | plan | respuesta de cambio |
| GET | `/api/fiscal` | `?ano=2025` | `{ok, csv, …informe}` (no en «Todos juntos») |
| POST | `/api/importar/previsualizar` | multipart: `origen` (`myinvestor` o tabla), `archivos[]`, `texto` | `{ok, token, informe}` |
| POST | `/api/importar/revisar` | `{token, respuestas}` | `{ok, token, informe}` |
| POST | `/api/importar/confirmar` | `{token, respuestas}` | respuesta de cambio + `informe` |
| GET | `/api/prompt` | — | `{texto}`: el prompt para que una IA pase tus datos a tabla |

### Copias, descargas y perfiles

| Método | Ruta | Entrada | Salida |
|---|---|---|---|
| GET | `/api/copias` | — | `{copias: CopiaSeguridad[]}` |
| GET | `/api/copia/descargar` | — | archivo `.json` |
| POST | `/api/copia/subir` | multipart `archivo` | `{ok}` |
| POST | `/api/copia/recuperar` | `{archivo}` | `{ok}` |
| GET | `/api/exportar-excel` · `/api/plantilla.xlsx` · `/api/plantilla.csv` | — | archivo |
| GET | `/api/exportar-web` | `?ocultar=1` | HTML estático del panel |
| GET | `/api/perfiles` | — | `{ok, activo, todos, lista}` |
| POST | `/api/perfiles` | `{nombre}` | `{ok, id}` (y lo activa) |
| POST | `/api/perfiles/activar` | `{id}` (o `"todos"`) | `{ok}` |
| POST | `/api/perfiles/renombrar` | `{id, nombre}` | `{ok}` |
| POST | `/api/perfiles/borrar` | `{id}` | `{ok}` (la carpeta va a copias) |

### Versión y soporte

| Método | Ruta | Salida |
|---|---|---|
| GET | `/api/version` | `{actual, ultima, repo, docker, hayNueva}` |
| GET | `/api/novedades` | `{actual, tuya, nueva, repo, docker}` |
| GET | `/api/diagnostico` | `{ok, texto}` (sin importes ni nombres) |

## El panel (`PanelDatos`)

Lo calcula `motor.construir()`. Las claves principales: `titular`, `fechaExtracto`, `fechas` (eje de todas las
series diarias), `productos` y `otrosActivos` (cada uno con `valor`, `aportado`, `plusvalia`, `rentabilidad`, `tir`,
`peso`, `serie`, `slotColor`…), `pasivos`, `total` (patrimonio, TIR, `porClase`/`porEntidad`/`porTipo`, `hitos`…),
`aportacionesMensuales`, `rentabilidadAnual`, `dividendos`, `comisiones`, `resumenMensual`, `comparador`,
`indiceCartera`, `avisos`, `modo` y `preciosActualizados`.

Las rentabilidades vienen en **tanto por uno** (`0.1843` = 18,43 %). El detalle está en `tipos.ts`.

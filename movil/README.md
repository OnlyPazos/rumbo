# Rumbo · app de Expo

App para iOS, Android y web de **[Rumbo](https://github.com/danidm98/rumbo)**, la herramienta de patrimonio de
**Dani Dominguez Quant** (MIT). Todos los cálculos los hace su backend; esta app es solo otra cara para usarla
desde el móvil. Más contexto en [`../FORK.md`](../FORK.md).

## Arrancar

```sh
npm install
npx expo start          # i = iOS, a = Android, w = web; o escanea el QR con Expo Go
```

Necesitas un Rumbo escuchando en la red (ver `../FORK.md`). En la pantalla «Conectar», pulsa **Escanear QR** y apunta
al QR que dibuja Rumbo al arrancar (o al de la página `/movil` en el navegador del ordenador). También puedes pegar la
dirección con la llave (`http://IP:8765/?acceso=…`) o escribirlas por separado.

## Estructura

```
src/
  app/                    rutas (Expo Router)
    _layout.tsx           pila de navegación, tema, sesión y datos del panel
    (tabs)/               las pestañas
      index.tsx           Panel: cifras, evolución (4 vistas), reparto, aportaciones y productos
      mes.tsx             El mes: cambio del mes, tú frente al mercado, producto a producto
      rendimiento.tsx     Rendimiento: frente a un indexado, por año, otras carteras, dividendos, comisiones
      mas.tsx             Más: perfiles, Renta, importar, conexión, versión y créditos
    producto/[id].tsx     ficha de un producto: cifras, evolución o precio, datos y movimientos
    editar-producto.tsx   añadir o editar un producto, con el buscador
    anotar.tsx            anotar o editar compras, ventas, dividendos, comisiones, traspasos, saldos y ajustes
    periodica.tsx         aportación periódica: una compra por mes con el precio de cada día
    objetivo.tsx          mi objetivo de patrimonio (o el siguiente hito)
    colchon.tsx           fondo de emergencia: meses de gastos o importe fijo
    reparto-objetivo.tsx  reparto objetivo: % por tipo de activo o producto, márgenes y qué cuenta
    renta.tsx             resumen para la Renta y compartir el CSV
    importar.tsx          importar de MyInvestor, Excel/CSV o el texto de una IA
    copias.tsx            copias de seguridad (recuperar, descargar, subir) y exportar a Excel
    conectar.tsx          dirección + llave del servidor (o con el QR)
    escanear.tsx          escáner del QR (expo-camera)
    acerca.tsx            créditos al autor original
  api/
    tipos.ts              tipos de la API (sacados del backend Python)
    cliente.ts            cliente de todos los endpoints (ver ../docs/API.md)
  graficos/               gráficos SVG (react-native-svg) y sus cálculos (escala.ts, sin dependencias)
  sesion/                 la conexión (SecureStore / localStorage) y los datos del panel compartidos
  componentes/            piezas compartidas (créditos, selectores, formulario, iconos)
  compartir.ts            compartir un archivo o una descarga de Rumbo (menú del sistema; descarga en web)
  formato.ts              números y fechas en es-ES (numEs entiende lo mismo que el backend)
  periodicas.ts           qué aportaciones periódicas toca anotar (portado de calculos.js, con sus pruebas)
  calculos.ts             países y sectores, liquidez, reparto objetivo y objetivo (portado de calculos.js, con sus pruebas)
  tema.ts                 colores del panel original, claro y oscuro
tests/                    pruebas de los cálculos (npm test, con node --test)
```

## Comprobaciones

```sh
npm test
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Notas

- Los gestos de los gráficos van con react-native-gesture-handler, con `runOnJS: true`: expo-router trae
  Reanimated y, sin esa opción, los callbacks irían al hilo de la interfaz y la app se cerraría al arrastrar.

## Pendiente

- Lo que aún solo está en el panel web: «Compartir mi mes».
- Builds de tienda: Rumbo va por HTTP dentro de casa / Tailscale. En Android hará falta permitir tráfico sin TLS
  (`expo-build-properties` → `android.usesCleartextTraffic`), y en iOS revisar ATS para las IP de Tailscale (100.x),
  o poner Rumbo detrás de HTTPS (Tailscale Serve).
- Servir la versión web exportada desde el propio Flask (mismo origen, sin CORS).

## Créditos

Rumbo © Dani Dominguez Quant — [github.com/danidm98/rumbo](https://github.com/danidm98/rumbo) — MIT.

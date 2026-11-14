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
  app/               rutas (Expo Router)
    _layout.tsx      pila de navegación y tema
    index.tsx        panel (por ahora: patrimonio, ganancia, TIR y productos)
    conectar.tsx     dirección + llave del servidor (o con el QR)
    escanear.tsx     escáner del QR (expo-camera)
    acerca.tsx       créditos al autor original
  api/
    tipos.ts         tipos de la API (sacados del backend Python)
    cliente.ts       cliente de todos los endpoints (ver ../docs/API.md)
  sesion/            dónde se guarda la conexión (SecureStore / localStorage) y su contexto
  componentes/       piezas compartidas (Creditos)
  formato.ts         números y fechas en es-ES
  tema.ts            colores del panel original, claro y oscuro
```

## Comprobaciones

```sh
npx tsc --noEmit
npx expo-doctor
```

## Pendiente

- Gráficas del panel (evolución, reparto): portar las SVG de `app/web/graficos.js` con `react-native-svg`.
- Ficha de producto, movimientos, saldos, buscador, perfiles, importar, Renta, copias.
- Builds de tienda: Rumbo va por HTTP dentro de casa / Tailscale. En Android hará falta permitir tráfico sin TLS
  (`expo-build-properties` → `android.usesCleartextTraffic`), y en iOS revisar ATS para las IP de Tailscale (100.x),
  o poner Rumbo detrás de HTTPS (Tailscale Serve).
- Servir la versión web exportada desde el propio Flask (mismo origen, sin CORS).

## Créditos

Rumbo © Dani Dominguez Quant — [github.com/danidm98/rumbo](https://github.com/danidm98/rumbo) — MIT.

# Rumbo en el móvil (fork con app de Expo)

> **Rumbo es obra de [Dani Dominguez Quant](https://www.youtube.com/channel/UCiS3qumDoE7QDwzo_ChU6yQ?sub_confirmation=1).**
> El repositorio original es **[github.com/danidm98/rumbo](https://github.com/danidm98/rumbo)**, con licencia MIT.
> Todo el valor de esta herramienta (el motor de cálculo, los precios, la Renta, los traspasos, los importadores…)
> es suyo. Este fork solo añade una app de Expo para usarla desde iOS, Android y web.
> Si te resulta útil, apoya al autor [suscribiéndote a su canal](https://www.youtube.com/channel/UCiS3qumDoE7QDwzo_ChU6yQ?sub_confirmation=1).

## Qué cambia respecto al original

La idea es tocar el original lo mínimo para poder seguir trayendo sus versiones nuevas sin conflictos.

| Dónde | Qué |
|---|---|
| `movil/` | **Nuevo.** La app de Expo (Expo Router + TypeScript). Ver [`movil/README.md`](movil/README.md). |
| `app/servidor.py` | Un bloque marcado `app móvil (fork rumbo-expo)`: llave en `Authorization: Bearer`, CORS opcional (`PATRIMONIO_ORIGENES_APP`), `GET /api/panel` (el panel en JSON) y el **QR para conectar el móvil** (en el terminal al arrancar abierto a la red y en la página `/movil`). Más una línea en `main()` que imprime el QR. El panel web original funciona igual. |
| `requirements.txt`, `pyproject.toml` | Añaden `qrcode` (BSD, Python puro). Es opcional: sin él, todo funciona salvo el dibujo del QR. `uv run` actualiza `uv.lock` solo. |
| `tests/test_app_movil.py` | **Nuevo.** Pruebas de lo anterior. |
| `docs/API.md` | **Nuevo.** Inventario de la API. |
| `FORK.md`, cabecera del `README.md` | Este documento y el aviso de fork con los créditos. |

## Cómo funciona

```
 iPhone / Android / navegador            casa (NAS, Raspberry o tu PC)
 ┌──────────────────────┐   Tailscale   ┌──────────────────────────────┐
 │ app Expo (movil/)    │ ────────────▶ │ Rumbo (Flask, Docker)        │
 │ Authorization: llave │   HTTP + JSON │ motor, precios, mis_datos/   │
 └──────────────────────┘               └──────────────────────────────┘
```

Los datos se quedan en `mis_datos/` del servidor. La app solo los pide y los enseña.

## Ponerlo en marcha

1. **Backend.** Como en el original (ver [README.md](README.md)), pero que escuche en la red:
   - Docker: ya lo hace, **pero hay que construir la imagen de este fork**: la de `ghcr.io/danidm98/rumbo` es la del
     original y no trae `/api/panel` ni la llave por cabecera. En `docker-compose.yml`, comenta `image:` y descomenta
     `build: .`, luego `docker compose up -d --build` (la llave sale en `docker compose logs rumbo`).
   - En tu PC, para probar (la llave está en `mis_datos/.acceso`; `PATRIMONIO_ORIGENES_APP` solo hace falta para la
     versión web de Expo en desarrollo):

     ```powershell
     # Windows (PowerShell)
     $env:PATRIMONIO_HOST = "0.0.0.0"; $env:PATRIMONIO_ORIGENES_APP = "http://localhost:8081"; .venv\Scripts\python -m app
     ```

     ```sh
     # Mac / Linux / Git Bash
     PATRIMONIO_HOST=0.0.0.0 PATRIMONIO_ORIGENES_APP=http://localhost:8081 .venv/bin/python -m app
     ```
2. **App.** `cd movil && npm install && npx expo start`. Abre con Expo Go (o pulsa `w` para web).
3. **Conectar con un QR.** En «Conectar», pulsa **Escanear QR** y apunta a:
   - el QR que Rumbo dibuja en su ventana al arrancar abierto a la red (con la IP de tu equipo ya puesta), o
   - la página **`http://<dirección-de-rumbo>:8765/movil`** en el navegador del ordenador (la que hay que usar con
     Docker, porque dentro del contenedor no se sabe la IP del NAS).

   El QR lleva la dirección y la llave: no lo compartas. También puedes escribirlas a mano.

Fuera de casa, usa una VPN como Tailscale. **No abras el puerto de Rumbo a internet.**

## Traer las novedades del original

```sh
git fetch upstream
git merge upstream/main     # los conflictos, si hay, solo pueden estar en app/servidor.py o README.md
python -m unittest discover -s tests -b
```

## Pruebas

```sh
python -m unittest discover -s tests -b     # backend (las del original + las del fork)
cd movil && npx tsc --noEmit && npx expo-doctor
```

## Licencia y créditos

MIT, como el original. El `LICENSE` conserva el copyright de **Dani Dominguez Quant** y así debe seguir. Cualquier
versión publicada de este fork (tiendas de apps, web) debe nombrarle como autor de Rumbo y enlazar al repositorio
original; la app lo hace en su pie y en la pantalla «Acerca de».

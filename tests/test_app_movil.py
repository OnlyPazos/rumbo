"""App de Expo (fork rumbo-expo): la llave en la cabecera Authorization, /api/panel y CORS."""
import os
from unittest import mock

from flask.testing import FlaskClient

from comun import ConCarpeta, PreciosInventados
from app import servidor


class AppMovil(ConCarpeta):
    def setUp(self):
        super().setUp()
        self.parches = [mock.patch.object(servidor, "DATOS", self.carpeta), PreciosInventados(),
                        mock.patch.dict(os.environ, {"PATRIMONIO_ORIGENES_APP": "http://localhost:8081"})]
        for p in self.parches:
            p.__enter__()
        servidor.app.test_client().post("/api/empezar", json={"desde": "vacia"})
        self.sin_cookie = FlaskClient(servidor.app)   # como la app: nunca manda la cookie

    def tearDown(self):
        for p in reversed(self.parches):
            p.__exit__(None, None, None)
        super().tearDown()

    def llave(self, valor=None):
        return {"Authorization": "Bearer " + (valor or servidor.token_acceso())}

    def test_con_la_llave_en_la_cabecera_entra(self):
        r = self.sin_cookie.get("/api/panel", headers=self.llave())
        self.assertEqual(r.status_code, 200)
        cuerpo = r.get_json()
        self.assertIsNone(cuerpo["datos"])   # cartera vacía: todavía no hay nada que calcular
        self.assertEqual(cuerpo["perfiles"]["activo"], servidor.PRINCIPAL)

    def test_el_panel_de_la_demo_trae_los_calculos(self):
        r = servidor.app.test_client().post("/api/reiniciar", json={"a": "demo"})
        self.assertEqual(r.status_code, 200)
        datos = self.sin_cookie.get("/api/panel", headers=self.llave()).get_json()["datos"]
        self.assertEqual(datos["modo"], "demo")
        self.assertGreater(datos["total"]["patrimonio"], 0)

    def test_sin_llave_o_con_una_mala_no(self):
        self.assertEqual(self.sin_cookie.get("/api/panel").status_code, 403)
        r = self.sin_cookie.get("/api/panel", headers=self.llave("x" * 43))
        self.assertEqual(r.status_code, 403)
        r = self.sin_cookie.get("/api/panel", headers=self.llave("ñ" * 43))   # no ASCII: no revienta
        self.assertEqual(r.status_code, 403)

    def test_una_llave_mala_en_la_cabecera_no_la_salva_la_cookie(self):
        r = servidor.app.test_client().get("/api/panel", headers=self.llave("x" * 43))
        self.assertEqual(r.status_code, 403)

    def test_la_llave_en_la_cabecera_sirve_desde_otra_direccion(self):
        # La web de Expo en desarrollo es «same-site» (otro puerto): con la llave en la cabecera vale.
        cab = {**self.llave(), "Sec-Fetch-Site": "same-site", "Origin": "http://localhost:8081"}
        r = self.sin_cookie.post("/api/productos", json={"nombre": "Cuenta", "tipo": "efectivo"}, headers=cab)
        self.assertEqual(r.status_code, 200, r.get_json())

    def test_cors_solo_para_los_origenes_permitidos(self):
        pre = {"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST",
               "Access-Control-Request-Headers": "authorization, content-type", "Sec-Fetch-Site": "same-site"}
        r = self.sin_cookie.options("/api/productos", headers=pre)
        self.assertEqual(r.status_code, 204)
        self.assertEqual(r.headers["Access-Control-Allow-Origin"], "http://localhost:8081")
        self.assertIn("Authorization", r.headers["Access-Control-Allow-Headers"])

        malo = {**pre, "Origin": "https://evil.com", "Sec-Fetch-Site": "cross-site"}
        r = self.sin_cookie.options("/api/productos", headers=malo)
        self.assertNotIn("Access-Control-Allow-Origin", r.headers)
        r = self.sin_cookie.get("/api/panel", headers={**self.llave(), "Origin": "https://evil.com"})
        self.assertNotIn("Access-Control-Allow-Origin", r.headers)

    def test_sin_origenes_configurados_no_hay_cors(self):
        with mock.patch.dict(os.environ, {"PATRIMONIO_ORIGENES_APP": ""}):
            r = self.sin_cookie.options("/api/panel", headers={"Origin": "http://localhost:8081",
                                                               "Sec-Fetch-Site": "same-site"})
            self.assertNotIn("Access-Control-Allow-Origin", r.headers)

    def test_la_direccion_sigue_vigilada(self):
        r = self.sin_cookie.get("/api/panel", headers={**self.llave(), "Host": "evil.com:8765"})
        self.assertEqual(r.status_code, 403)

    def test_qr_para_conectar_el_movil(self):
        url = servidor.url_movil("192.168.1.50:8765")
        self.assertTrue(url.startswith("http://192.168.1.50:8765/?acceso="))
        m = servidor.qr_matriz(url)
        self.assertEqual(len(m), len(m[0]))
        self.assertIn("█", servidor.qr_terminal(url))
        self.assertIn("<svg", servidor.qr_svg(url))

    def test_pagina_movil_con_la_direccion_del_navegador(self):
        with mock.patch.dict(os.environ, {"PATRIMONIO_HOST": "0.0.0.0"}):
            r = servidor.app.test_client().get("/movil", headers={"Host": "192.168.1.50:8765"})
        self.assertEqual(r.status_code, 200)
        self.assertIn(servidor.url_movil("192.168.1.50:8765").encode(), r.data)
        self.assertIn(b"<svg", r.data)

    def test_pagina_movil_sin_red_lo_explica(self):
        r = servidor.app.test_client().get("/movil")
        self.assertEqual(r.status_code, 200)
        self.assertIn("solo escucha en este ordenador".encode(), r.data)
        self.assertNotIn(servidor.token_acceso().encode(), r.data)

    def test_pagina_movil_necesita_la_llave(self):
        r = self.sin_cookie.get("/movil")
        self.assertEqual(r.status_code, 403)
        self.assertNotIn(servidor.token_acceso().encode(), r.data)
        r = self.sin_cookie.get("/movil", headers={"Sec-Fetch-Site": "cross-site", "Sec-Fetch-Mode": "navigate"})
        self.assertEqual(r.status_code, 403)

    def test_direcciones_de_red_solo_privadas(self):
        for ip in servidor.direcciones_de_red():
            d = servidor.ipaddress.ip_address(ip)
            self.assertTrue(d.is_private or d in servidor.TAILSCALE)
            self.assertFalse(d.is_loopback)

    def test_el_navegador_de_siempre_sigue_igual(self):
        r = servidor.app.test_client().get("/datos.js", headers={"Sec-Fetch-Site": "same-origin"})
        self.assertEqual(r.status_code, 200)
        self.assertIn(b"window.DATOS", r.data)

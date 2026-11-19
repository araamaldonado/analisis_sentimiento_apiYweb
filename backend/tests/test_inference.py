import subprocess
import sys
from pathlib import Path

import pytest

import inference

BACKEND = Path(__file__).resolve().parent.parent


def test_importar_inference_no_carga_el_modelo():
    # En un proceso aparte, para que no influyan otros tests que ya hayan cargado el modelo
    codigo = "import inference; assert inference._clasificador is None"
    r = subprocess.run([sys.executable, "-c", codigo], cwd=BACKEND, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr

import types

def test_el_modelo_se_carga_una_sola_vez(monkeypatch):

    cargas = []

    def pipeline_falso(*args, **kwargs):
        cargas.append(1)
        return lambda textos, **kw: [{"label": "POS", "score": 0.9} for _ in textos]

    modulo_falso = types.ModuleType("transformers")
    modulo_falso.pipeline = pipeline_falso
    monkeypatch.setitem(sys.modules, "transformers", modulo_falso)
    monkeypatch.setattr(inference, "_clasificador", None)

    inference.analizar_sentimientos_lote(["Me encantó"])
    inference.analizar_sentimientos_lote(["Muy malo"])

    assert len(cargas) == 1


def test_textos_sin_palabras_no_cargan_el_modelo(monkeypatch):
    def no_deberia_cargarse():
        pytest.fail("El modelo no debería cargarse para textos inválidos")

    monkeypatch.setattr(inference, "obtener_clasificador", no_deberia_cargarse)

    resultados = inference.analizar_sentimientos_lote([",.,.,.", "", "   ", "12345", "a a a", "x-y-z", "a1b2c3", "ok"])

    assert all("error" in r and "etiqueta" not in r for r in resultados)


def test_mantiene_el_orden_con_textos_validos_e_invalidos(modelo_falso):
    textos = ["Me encantó", ",.,.", "Muy malo"]

    resultados = inference.analizar_sentimientos_lote(textos)

    assert [r["texto"] for r in resultados] == textos
    assert "etiqueta" in resultados[0]
    assert "error" in resultados[1]
    assert "etiqueta" in resultados[2]

import pytest
from fastapi.testclient import TestClient

from main import MAX_CHARS_TEXTO, MAX_TEXTOS, app

client = TestClient(app)
URL = "/api/sentiment/batch"


def analizar(*textos):
    return client.post(URL, json={"textos": list(textos)})


# ---------- Con el modelo real (lento la primera vez). Se corren con: pytest -m modelo ----------
# Si alguna falla, reemplaza la frase por una de tu test.py que sepas que el modelo clasifica bien.
@pytest.mark.modelo
@pytest.mark.parametrize(
    "texto, esperado",
    [
        ("Me encantó, es excelente, lo recomiendo muchísimo", "Positivo"),
        ("Es horrible, un desastre, no lo recomiendo para nada", "Negativo"),
        ("El paquete llegó el martes por la tarde", "Neutral"),
    ],
)
def test_clasifica_sentimiento(texto, esperado):
    r = analizar(texto)

    assert r.status_code == 200
    resultado = r.json()["resultados"][0]
    assert resultado["etiqueta"] == esperado
    assert 0 <= resultado["confianza"] <= 1


# ---------- Textos inválidos ----------
@pytest.mark.parametrize("texto", ["", "   ", ",.,.,.", "12345", "!!!???"])
def test_texto_sin_palabras_devuelve_error(texto):
    r = analizar(texto)

    assert r.status_code == 200
    resultado = r.json()["resultados"][0]
    assert "error" in resultado
    assert "etiqueta" not in resultado


def test_lote_mixto_mantiene_el_orden(modelo_falso):
    textos = ["Me encantó", ",.,.", "Muy malo"]

    resultados = analizar(*textos).json()["resultados"]

    assert [r["texto"] for r in resultados] == textos
    assert "etiqueta" in resultados[0]
    assert "error" in resultados[1]
    assert "etiqueta" in resultados[2]


# ---------- Límites ----------
def test_acepta_exactamente_el_maximo_de_textos(modelo_falso):
    r = analizar(*["hola mundo"] * MAX_TEXTOS)

    assert r.status_code == 200
    assert len(r.json()["resultados"]) == MAX_TEXTOS


def test_rechaza_mas_textos_que_el_maximo():
    assert analizar(*["hola mundo"] * (MAX_TEXTOS + 1)).status_code == 422


def test_acepta_un_texto_de_largo_maximo(modelo_falso):
    assert analizar("a" * MAX_CHARS_TEXTO).status_code == 200


def test_rechaza_un_texto_mas_largo_que_el_maximo():
    assert analizar("a" * (MAX_CHARS_TEXTO + 1)).status_code == 422


def test_rechaza_una_lista_vacia():
    assert client.post(URL, json={"textos": []}).status_code == 422


def test_rechaza_un_cuerpo_con_formato_incorrecto():
    assert client.post(URL, json={"texto": "hola"}).status_code == 422

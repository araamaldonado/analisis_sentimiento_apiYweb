import threading

_clasificador = None
_candado = threading.Lock()


def obtener_clasificador():
    global _clasificador
    if _clasificador is None:
        with _candado:
            if _clasificador is None:
                import torch
                from transformers import pipeline

                _clasificador = pipeline(
                    "sentiment-analysis",
                    model="pysentimiento/robertuito-sentiment-analysis",
                    device=0 if torch.cuda.is_available() else -1,
                )
    return _clasificador

MAPEO_ETIQUETAS = {
    "POS": "Positivo",
    "NEG": "Negativo",
    "NEU": "Neutral"
}

def tiene_sentido(t: str) -> bool:
    sin_esp = "".join(t.split())
    letras = sum(c.isalpha() for c in sin_esp)
    return letras >= 3 and letras / len(sin_esp) >= 0.5

def analizar_sentimientos_lote(textos: list[str]) -> list[dict]:
    # Respuesta por default, que si el texto es válido se modifica
    salida = [
        {"texto": t, "error": "El texto no contiene palabras analizables."}
        for t in textos
    ]
    validos = [(i, t) for i, t in enumerate(textos) if tiene_sentido(t)]

    if validos:
        resultados = obtener_clasificador()(
            [t for _, t in validos],
            batch_size=16,
            truncation=True,
            max_length=128,
        )
        for (i, t), res in zip(validos, resultados):
            salida[i] = {
                "texto": t,
                "etiqueta": MAPEO_ETIQUETAS.get(res["label"], "Neutral"),
                "confianza": round(res["score"], 4),
            }
    return salida
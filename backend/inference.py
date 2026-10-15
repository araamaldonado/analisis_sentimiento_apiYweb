from transformers import pipeline

clasificador = pipeline(
    "sentiment-analysis",
    model="pysentimiento/robertuito-sentiment-analysis"
)

MAPEO_ETIQUETAS = {
    "POS": "Positivo",
    "NEG": "Negativo",
    "NEU": "Neutral"
}

def analizar_sentimientos_lote(textos: list[str]) -> list[dict]:
    # El pipeline acepta listas completas nativamente
    resultados = clasificador(textos, truncation=True, max_length=128)
    
    salida = []
    for texto, res in zip(textos, resultados):
        etiqueta_normalizada = MAPEO_ETIQUETAS.get(res["label"], "Neutral")
        salida.append({
            "texto": texto,
            "etiqueta": etiqueta_normalizada,
            "confianza": round(res["score"], 4)
        })
    return salida
from transformers import pipeline

clasificador = pipeline(
    "sentiment-analysis",
    model = "pysentimiento/robertuito-sentiment-analysis" 
)

def analizar_sentimiento(texto: str) -> dict:
    resultado = clasificador(texto)[0]
    normalizacion_etiqueta = "Positivo" if resultado["label"] == "POS" else "Negativo" if resultado["label"] == "NEG" else "Neutral"
    return {
        "etiqueta": normalizacion_etiqueta,
        "confianza": round(resultado["score"], 4)
    }
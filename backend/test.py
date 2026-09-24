from transformers import pipeline

clasificador = pipeline(
    "sentiment-analysis",
    model = "pysentimiento/robertuito-sentiment-analysis" 
)

frases = [
    "Me encantó esta película, la disfruté muchísimo",
    "Es el peor servicio que recibí en mi vida, una porquería",
    "El paquete llegó el martes a las 15hs"
]

for frase in frases:
    resultado = clasificador(frase)[0]
    print(f"Frase: {frase}")
    print(f" -> Etiqueta: {resultado['label']}, Confianza: {resultado['score']:.4f}")
    print()
import csv
import json
import random
from pathlib import Path
import kagglehub

# ---- Configuración ----
TOTAL = 78            # cantidad total de comentarios ANTES de sumar los neutros.
LARGO_MAX = 465        # límite del modelo; poné None para no filtrar por largo
SEMILLA = 30           # misma semilla = mismo resultado siempre
archivo_json = "imdb_reviews_test.json" 
# aclaración sobre el archivo: es un JSON con una lista de diccionarios, cada uno con dos claves: "review_es" y "sentimiento"
# fake_reviews_neu.json es otro archivo JSON con 22 comentarios neutros, que se agregan al final para tener un total de 100 comentarios,
# si usted gusta, puede generar sus propios comentarios neutros y agregarlos a ese archivo

# ---- Descarga y lectura ----
path = kagglehub.dataset_download("luisdiegofv97/imdb-dataset-of-50k-movie-reviews-spanish")
archivo_csv = next(Path(path).glob("*.csv"))

por_clase = {}  # {"positivo": [...], "negativo": [...]}

with open(archivo_csv, encoding="utf-8", newline="") as f:
    for fila in csv.DictReader(f):
        texto = fila["review_es"].strip()
        etiqueta = fila["sentimiento"].strip()

        if LARGO_MAX is not None and len(texto) > LARGO_MAX:
            continue

        por_clase.setdefault(etiqueta, []).append(
            {"review_es": texto, "sentimiento": etiqueta}
        )

# ---- Balance: misma cantidad de cada clase ----
random.seed(SEMILLA)
por_cada_clase = TOTAL // len(por_clase)

comentarios_prueba = []
for etiqueta, lista in por_clase.items():
    print(f"{etiqueta}: {len(lista)} disponibles")
    comentarios_prueba += random.sample(lista, por_cada_clase)

random.shuffle(comentarios_prueba)  # mezcla para que no queden todas las positivas juntas

# ---- Guardado ----
with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump(comentarios_prueba, f, ensure_ascii=False, indent=2)

print(f"\nGuardados {len(comentarios_prueba)} comentarios en {archivo_json}")

# ---- Vista de cada comentario ----
for i, c in enumerate(comentarios_prueba, start=1):
    print(f"{i}. [{c['sentimiento']}] ({len(c['review_es'])} caracteres)")
    print(c["review_es"])
    print()


# ---- Agregar comentarios neutros ----

with open(archivo_json, encoding="utf-8") as f:
    reviews = json.load(f)          # las 78 que ya tenés

with open("fake_reviews_neu.json", encoding="utf-8") as f:
    neutras = json.load(f)          # las 22 de arriba

reviews += neutras
random.seed(30)
random.shuffle(reviews)

with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump(reviews, f, ensure_ascii=False, indent=2)

print(len(reviews))  # 100
#!/usr/bin/env python3
"""
Compara el resultado esperado (dataset etiquetado) con el resultado real de la app.

Uso (desde la carpeta donde estén los archivos):
    python comparacion_sets.py mis_reviews_resultados.json
    python comparacion_sets.py mis_reviews_resultados.json --esperado reviews_test.json
    python comparacion_sets.py mis_reviews_resultados.json -o comparacion.csv --sep ","

Entradas
    --esperado   JSON con los textos y su etiqueta correcta (por defecto reviews_test.json):
                 [{"review_es": "...", "sentimiento": "positivo"}, ...]
    resultados   JSON descargado desde la app:
                 [{"comentario": "...", "sentimiento": "neutral", "confianza": "96%"}, ...]

Salidas
    <nombre>_comparacion.csv   una fila por texto: esperado, obtenido, confianza y si acertó
    <nombre>_metricas.csv      accuracy, precisión/recall/F1 por clase y matriz de confusión
    (además todo se muestra por consola)

Los textos se emparejan por contenido, no por posición, así que el orden de los
archivos no importa. Solo usa la librería estándar de Python (sin pandas).
"""

import argparse
import csv
import json
import sys
import unicodedata
from collections import defaultdict, deque
from pathlib import Path

# Nombres de etiqueta aceptados -> nombre normalizado
ETIQUETAS = {
    "positivo": "positivo", "pos": "positivo", "positive": "positivo",
    "negativo": "negativo", "neg": "negativo", "negative": "negativo",
    "neutral": "neutral", "neu": "neutral", "neutro": "neutral",
}
ORDEN_CLASES = ["positivo", "negativo", "neutral"]

# Nombres de campo aceptados
CLAVES_TEXTO = ("review_es", "comentario", "texto", "text")
CLAVES_ETIQUETA = ("sentimiento", "etiqueta", "label")

# Estados de cada fila
CORRECTO = "Correcto"
INCORRECTO = "Incorrecto"
NO_ANALIZADO = "No analizado"          # el texto no aparece en el archivo de resultados
ERROR_ANALISIS = "Error de análisis"   # la app lo devolvió con "error"


def salir(mensaje):
    print(f"Error: {mensaje}", file=sys.stderr)
    sys.exit(1)


def quitar_acentos(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def normalizar_etiqueta(valor, origen):
    clave = quitar_acentos(str(valor)).strip().lower()
    if clave not in ETIQUETAS:
        salir(f"etiqueta desconocida {valor!r} en {origen}. Se esperaba una de: positivo, negativo, neutral.")
    return ETIQUETAS[clave]


def normalizar_texto(texto):
    """Colapsa espacios y saltos de línea para que el emparejamiento sea tolerante."""
    return " ".join(str(texto).split())


def primer_valor(item, claves):
    for clave in claves:
        if clave in item:
            return item[clave]
    return None


def cargar_lista(ruta):
    try:
        with open(ruta, encoding="utf-8-sig") as f:
            datos = json.load(f)
    except FileNotFoundError:
        salir(f"no se encontró el archivo {ruta!r}.")
    except json.JSONDecodeError as e:
        salir(f"{ruta!r} no es un JSON válido ({e}).")
    if not isinstance(datos, list):
        salir(f"{ruta!r} debe contener una lista de objetos.")
    return datos


def cargar_esperados(ruta):
    """Devuelve [(texto, etiqueta_esperada)]."""
    esperados = []
    for i, item in enumerate(cargar_lista(ruta), start=1):
        if not isinstance(item, dict):
            salir(f"el elemento {i} de {ruta!r} no es un objeto.")
        texto = primer_valor(item, CLAVES_TEXTO)
        etiqueta = primer_valor(item, CLAVES_ETIQUETA)
        if texto is None or etiqueta is None:
            salir(f"el elemento {i} de {ruta!r} necesita texto ({'/'.join(CLAVES_TEXTO)}) "
                  f"y etiqueta ({'/'.join(CLAVES_ETIQUETA)}).")
        esperados.append((str(texto), normalizar_etiqueta(etiqueta, f"{ruta} (elemento {i})")))
    return esperados


def cargar_resultados(ruta):
    """Devuelve [{'texto', 'etiqueta', 'confianza', 'error'}]."""
    resultados = []
    for i, item in enumerate(cargar_lista(ruta), start=1):
        if not isinstance(item, dict):
            salir(f"el elemento {i} de {ruta!r} no es un objeto.")
        texto = primer_valor(item, CLAVES_TEXTO)
        if texto is None:
            salir(f"el elemento {i} de {ruta!r} no tiene el campo 'comentario'.")
        if item.get("error"):
            resultados.append({"texto": str(texto), "etiqueta": None,
                               "confianza": "", "error": str(item["error"])})
            continue
        etiqueta = primer_valor(item, CLAVES_ETIQUETA)
        if etiqueta is None:
            salir(f"el elemento {i} de {ruta!r} no tiene 'sentimiento' ni 'error'.")
        resultados.append({"texto": str(texto),
                           "etiqueta": normalizar_etiqueta(etiqueta, f"{ruta} (elemento {i})"),
                           "confianza": str(item.get("confianza", "")), "error": None})
    return resultados


def comparar(esperados, resultados):
    """Empareja por texto. Devuelve (filas, resultados_sin_emparejar)."""
    pendientes = defaultdict(deque)
    for r in resultados:
        pendientes[normalizar_texto(r["texto"])].append(r)

    filas = []
    for n, (texto, esperado) in enumerate(esperados, start=1):
        cola = pendientes.get(normalizar_texto(texto))
        r = cola.popleft() if cola else None   # popleft: textos repetidos se emparejan en orden

        if r is None:
            fila = {"obtenido": "", "confianza": "", "estado": NO_ANALIZADO}
        elif r["error"]:
            fila = {"obtenido": "", "confianza": "", "estado": ERROR_ANALISIS}
        else:
            fila = {"obtenido": r["etiqueta"], "confianza": r["confianza"],
                    "estado": CORRECTO if r["etiqueta"] == esperado else INCORRECTO}
        fila.update({"n": n, "texto": texto, "esperado": esperado})
        filas.append(fila)

    sobrantes = sum(len(cola) for cola in pendientes.values())
    return filas, sobrantes


def calcular_metricas(filas):
    evaluadas = [f for f in filas if f["estado"] in (CORRECTO, INCORRECTO)]
    clases = [c for c in ORDEN_CLASES
              if any(f["esperado"] == c or f["obtenido"] == c for f in evaluadas)]

    matriz = {e: {o: 0 for o in clases} for e in clases}
    for f in evaluadas:
        matriz[f["esperado"]][f["obtenido"]] += 1

    por_clase = {}
    for c in clases:
        vp = matriz[c][c]
        predichos = sum(matriz[e][c] for e in clases)
        reales = sum(matriz[c].values())
        precision = vp / predichos if predichos else 0.0
        recall = vp / reales if reales else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        por_clase[c] = {"precision": precision, "recall": recall, "f1": f1, "soporte": reales}

    aciertos = sum(1 for f in evaluadas if f["estado"] == CORRECTO)
    return {
        "evaluadas": len(evaluadas),
        "aciertos": aciertos,
        "accuracy": aciertos / len(evaluadas) if evaluadas else 0.0,
        "macro_f1": sum(m["f1"] for m in por_clase.values()) / len(por_clase) if por_clase else 0.0,
        "clases": clases,
        "por_clase": por_clase,
        "matriz": matriz,
    }


def recortar(texto, largo):
    texto = normalizar_texto(texto)
    if largo and len(texto) > largo:
        return texto[: largo - 1].rstrip() + "…"
    return texto


def formato_numero(sep):
    """Porcentaje con 1 decimal; con coma decimal si el separador de columnas es ';' (Excel en español)."""
    def fmt(x):
        s = f"{x * 100:.1f}%"
        return s.replace(".", ",") if sep == ";" else s
    return fmt


def escribir_comparacion(ruta, filas, sep, largo):
    with open(ruta, "w", encoding="utf-8-sig", newline="") as f:   # utf-8-sig: Excel muestra bien tildes y ñ
        w = csv.writer(f, delimiter=sep)
        w.writerow(["n", "comentario", "esperado", "obtenido", "confianza", "resultado"])
        for fila in filas:
            w.writerow([fila["n"], recortar(fila["texto"], largo), fila["esperado"],
                        fila["obtenido"], fila["confianza"], fila["estado"]])


def escribir_metricas(ruta, m, sep, fmt):
    with open(ruta, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=sep)
        w.writerow(["resumen", "valor"])
        w.writerow(["textos evaluados", m["evaluadas"]])
        w.writerow(["aciertos", m["aciertos"]])
        w.writerow(["accuracy", fmt(m["accuracy"])])
        w.writerow(["F1 macro", fmt(m["macro_f1"])])
        w.writerow([])
        w.writerow(["clase", "precision", "recall", "F1", "cantidad real"])
        for c in m["clases"]:
            p = m["por_clase"][c]
            w.writerow([c, fmt(p["precision"]), fmt(p["recall"]), fmt(p["f1"]), p["soporte"]])
        w.writerow([])
        w.writerow(["matriz de confusión (filas = esperado, columnas = obtenido)"])
        w.writerow([""] + m["clases"])
        for e in m["clases"]:
            w.writerow([e] + [m["matriz"][e][o] for o in m["clases"]])


def mostrar_consola(filas, m, sobrantes, fmt, largo):
    ancho = 12
    print(f"\n{'N':>3}  {'COMENTARIO':<{largo + 1}} {'ESPERADO':<{ancho}} {'OBTENIDO':<{ancho}} {'CONF.':>6}  RESULTADO")
    print("-" * (3 + largo + 2 * ancho + 22))
    for f in filas:
        print(f"{f['n']:>3}  {recortar(f['texto'], largo):<{largo + 1}} {f['esperado']:<{ancho}} "
              f"{f['obtenido'] or '-':<{ancho}} {f['confianza'] or '-':>6}  {f['estado']}")

    print("\n=== RESUMEN ===")
    print(f"Textos evaluados: {m['evaluadas']}  |  Aciertos: {m['aciertos']}  |  "
          f"Accuracy: {fmt(m['accuracy'])}  |  F1 macro: {fmt(m['macro_f1'])}")

    sin = [f for f in filas if f["estado"] == NO_ANALIZADO]
    err = [f for f in filas if f["estado"] == ERROR_ANALISIS]
    if sin:
        print(f"Aviso: {len(sin)} texto(s) del dataset no aparecen en el archivo de resultados "
              f"(n = {', '.join(str(f['n']) for f in sin[:15])}{'…' if len(sin) > 15 else ''}).")
    if err:
        print(f"Aviso: {len(err)} texto(s) devolvieron error en la app y no cuentan en las métricas "
              f"(n = {', '.join(str(f['n']) for f in err[:15])}{'…' if len(err) > 15 else ''}).")
    if sobrantes:
        print(f"Aviso: {sobrantes} resultado(s) de la app no coinciden con ningún texto del dataset.")

    print("\nPor clase:")
    print(f"  {'clase':<10} {'precision':>10} {'recall':>8} {'F1':>8} {'cantidad':>9}")
    for c in m["clases"]:
        p = m["por_clase"][c]
        print(f"  {c:<10} {fmt(p['precision']):>10} {fmt(p['recall']):>8} {fmt(p['f1']):>8} {p['soporte']:>9}")

    print("\nMatriz de confusión (filas = esperado, columnas = obtenido):")
    print("  " + " " * 10 + "".join(f"{c:>10}" for c in m["clases"]))
    for e in m["clases"]:
        print(f"  {e:<10}" + "".join(f"{m['matriz'][e][o]:>10}" for o in m["clases"]))


def main():
    ap = argparse.ArgumentParser(description="Compara el resultado esperado con el resultado real de la app.")
    ap.add_argument("resultados", help="JSON descargado de la app (por ejemplo mi_archivo_resultados.json)")
    ap.add_argument("--esperado", default="reviews_test.json",
                    help="JSON con los textos y etiquetas correctas (por defecto: reviews_test.json)")
    ap.add_argument("-o", "--salida", help="nombre del CSV de comparación (por defecto: <resultados>_comparacion.csv)")
    ap.add_argument("--sep", default=";", choices=[",", ";"],
                    help="separador de columnas del CSV: ';' abre bien en Excel en español (por defecto), ',' para el estándar")
    ap.add_argument("--largo", type=int, default=80,
                    help="caracteres máximos del comentario en CSV y consola (0 = texto completo en el CSV)")
    args = ap.parse_args()

    esperados = cargar_esperados(args.esperado)
    resultados = cargar_resultados(args.resultados)
    filas, sobrantes = comparar(esperados, resultados)
    m = calcular_metricas(filas)
    if m["evaluadas"] == 0:
        salir("ningún texto del dataset coincide con el archivo de resultados. "
              "Verifique que sean del mismo conjunto de reseñas.")

    base = Path(args.resultados).stem
    base = base[: -len("_resultados")] if base.endswith("_resultados") else base
    salida = Path(args.salida) if args.salida else Path(f"{base}_comparacion.csv")
    raiz = salida.stem[: -len("_comparacion")] if salida.stem.endswith("_comparacion") else salida.stem
    salida_metricas = salida.with_name(f"{raiz}_metricas.csv")

    fmt = formato_numero(args.sep)
    escribir_comparacion(salida, filas, args.sep, args.largo)
    escribir_metricas(salida_metricas, m, args.sep, fmt)

    mostrar_consola(filas, m, sobrantes, fmt, min(args.largo, 60) if args.largo else 60)
    print(f"\nArchivos generados:\n  {salida}\n  {salida_metricas}")


if __name__ == "__main__":
    main()
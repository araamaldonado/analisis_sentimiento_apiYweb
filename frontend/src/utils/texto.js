// ========== Límites de la app ==========
export const MAX_CHARS = 465 // caracteres por parte (el modelo admite ~128 tokens)
export const MAX_PARTES = 20 // partes máximas por texto
export const MAX_ITEMS = 200 // textos máximos por archivo
export const MAX_BYTES = 1024 * 1024 // tamaño máximo del archivo (1 MB)

// Claves que se aceptan como "el texto" dentro de cada objeto del JSON
const CLAVES_TEXTO = ['texto', 'text', 'comentario', 'comment', 'mensaje', 'contenido']

// ========== Errores propios ==========
// Mensajes pensados para mostrarse a la persona usuaria
export class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje)
    this.name = 'ErrorValidacion'
  }
}

export class ErrorCancelado extends Error {
  constructor() {
    super('Análisis cancelado')
    this.name = 'ErrorCancelado'
  }
}

// ========== Dividir un texto largo en partes de hasta `max` caracteres ==========
// Intenta cortar al final de una oración; si no hay, en un espacio; si no, corte duro.
export function dividirTexto(texto, max = MAX_CHARS) {
  let resto = (texto ?? '').trim()
  const partes = []

  while (resto.length > max) {
    const ventana = resto.slice(0, max)

    const finOracion = Math.max(
      ventana.lastIndexOf('. '),
      ventana.lastIndexOf('! '),
      ventana.lastIndexOf('? '),
      ventana.lastIndexOf('\n'),
    )

    let fin
    if (finOracion >= max * 0.5) {
      fin = finOracion + 1 // incluye el signo de puntuación
    } else {
      const espacio = ventana.lastIndexOf(' ')
      fin = espacio >= max * 0.3 ? espacio : max
    }

    partes.push(resto.slice(0, fin).trim())
    resto = resto.slice(fin).trim()
  }

  if (resto) partes.push(resto)
  return partes
}

// ========== Resultado general a partir de los resultados de cada parte ==========
// Voto ponderado: cada parte suma (confianza × largo) a su etiqueta.
// Gana la etiqueta con más puntaje; la confianza general es su parte del total.
export function combinarResultados(partes) {
  const puntajes = {}
  let total = 0

  for (const p of partes) {
    const peso = p.texto.length
    puntajes[p.etiqueta] = (puntajes[p.etiqueta] ?? 0) + p.confianza * peso
    total += peso
  }

  const [etiqueta, puntaje] = Object.entries(puntajes).sort((a, b) => b[1] - a[1])[0]
  return { etiqueta, confianza: puntaje / total }
}

// ========== Leer el archivo subido (.json o .txt) ==========
// Devuelve [{ id, texto }]. Lanza ErrorValidacion con un mensaje claro si algo falla.
export function leerArchivo(nombre, contenido) {
  const extension = nombre.split('.').pop().toLowerCase()
  const limpio = contenido.replace(/^﻿/, '') // quita el BOM si lo hay

  let items
  if (extension === 'json') {
    items = leerJSON(limpio)
  } else if (extension === 'txt') {
    items = limpio
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean)
      .map((texto, i) => ({ id: i + 1, texto }))
  } else {
    throw new ErrorValidacion('Formato no soportado. Use un archivo .json o .txt.')
  }

  if (items.length === 0) {
    throw new ErrorValidacion('El archivo no contiene textos para analizar.')
  }
  if (items.length > MAX_ITEMS) {
    throw new ErrorValidacion(
      `El archivo tiene ${items.length} textos y el máximo es ${MAX_ITEMS}.`,
    )
  }
  return items
}

function leerJSON(contenido) {
  let datos
  try {
    datos = JSON.parse(contenido)
  } catch {
    throw new ErrorValidacion('El archivo JSON no es válido.')
  }

  const lista = Array.isArray(datos)
    ? datos
    : (datos?.textos ?? datos?.comentarios ?? datos?.items)

  if (!Array.isArray(lista)) {
    throw new ErrorValidacion(
      'El JSON debe ser una lista, o un objeto con la clave "textos".',
    )
  }

  return lista
    .map((elemento, i) => {
      if (typeof elemento === 'string') {
        return { id: i + 1, texto: elemento.trim() }
      }
      if (elemento && typeof elemento === 'object') {
        const clave = CLAVES_TEXTO.find((k) => typeof elemento[k] === 'string')
        if (clave) return { id: elemento.id ?? i + 1, texto: elemento[clave].trim() }
      }
      throw new ErrorValidacion(`El elemento ${i + 1} no tiene un campo "texto".`)
    })
    .filter((item) => item.texto)
}

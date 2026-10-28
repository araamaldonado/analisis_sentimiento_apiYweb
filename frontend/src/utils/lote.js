import {
  MAX_CHARS,
  MAX_PARTES,
  ErrorCancelado,
  ErrorValidacion,
  dividirTexto,
  combinarResultados,
  validarTexto,
} from './texto.js'

// Cantidad máxima de textos por petición. DEBE coincidir con
// `max_length` de `textos` en LoteInput (backend/main.py). Es independiente del
// máximo de textos por archivo (MAX_ITEMS en texto.js), que puede ser mayor.
export const MAX_POR_PETICION = 64

// Analiza los textos de un archivo:
//  1. valida cada texto (uno inválido queda marcado con error, no tumba a los demás),
//  2. divide los textos largos en partes de hasta MAX_CHARS,
//  3. manda las partes al servidor en tandas de hasta MAX_ITEMS (el límite del backend),
//  4. junta las partes de cada texto en un resultado general.
//
// items:           [{ id, texto }]
// analizarPartes:  async (arrayDeStrings) => [{ etiqueta, confianza, error? }, ...]
// opciones:        { alProgresar(actual, total), estaCancelado() }
//
// Devuelve [{ id, texto, etiqueta, confianza, partes: [...] }] o, si ese texto falló,
// [{ id, texto, error: 'mensaje claro' }].
export async function analizarLote(items, analizarPartes, { alProgresar, estaCancelado } = {}) {
  const resultados = items.map((item) => ({ ...item }))
  const trabajos = [] // una entrada por parte: { indice, texto }

  items.forEach((item, indice) => {
    const mensaje = validarTexto(item.texto)
    if (mensaje) {
      resultados[indice].error = mensaje
      return
    }

    const partes = dividirTexto(item.texto)
    if (partes.length > MAX_PARTES) {
      resultados[indice].error =
        `El texto es demasiado largo (${partes.length} partes; máximo ${MAX_PARTES} partes de ${MAX_CHARS} caracteres).`
      return
    }

    resultados[indice].partes = []
    partes.forEach((texto) => trabajos.push({ indice, texto }))
  })

  if (trabajos.length === 0) return resultados

  for (let desde = 0; desde < trabajos.length; desde += MAX_POR_PETICION) {
    if (estaCancelado?.()) throw new ErrorCancelado()

    const tanda = trabajos.slice(desde, desde + MAX_POR_PETICION)
    const respuestas = await analizarPartes(tanda.map((t) => t.texto))

    if (estaCancelado?.()) throw new ErrorCancelado()

    if (!Array.isArray(respuestas) || respuestas.length !== tanda.length) {
      throw new ErrorValidacion(
        'El servidor devolvió una cantidad de resultados distinta a la enviada. Intente nuevamente.',
      )
    }

    tanda.forEach((trabajo, j) => {
      // Se guarda el texto de la parte para poder ponderar por largo al combinar
      resultados[trabajo.indice].partes.push({ ...respuestas[j], texto: trabajo.texto })
    })

    alProgresar?.(Math.min(desde + MAX_POR_PETICION, trabajos.length), trabajos.length)
  }

  // Un resultado general por texto
  resultados.forEach((resultado) => {
    if (!resultado.partes) return // ya tiene error de validación
    const buenas = resultado.partes.filter((p) => !p.error)

    if (buenas.length === 0) {
      resultado.error = resultado.partes[0]?.error ?? 'No se pudo analizar este texto.'
      delete resultado.partes
      return
    }

    const general = combinarResultados(buenas)
    resultado.etiqueta = general.etiqueta
    resultado.confianza = general.confianza
    resultado.partes = buenas
  })

  return resultados
}

// Traduce errores de red / del servidor a un mensaje claro para la persona usuaria.
// Devuelve null si el error no es de ese tipo.
export function mensajeErrorServidor(err) {
  if (err?.code === 'ERR_NETWORK') {
    return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.'
  }
  if (err?.code === 'ECONNABORTED') {
    return 'El servidor tardó demasiado en responder. Pruebe con un archivo más chico.'
  }

  const estado = err?.response?.status
  if (!estado) return null

  if (estado === 422) {
    const detalle = err.response.data?.detail
    const motivo = Array.isArray(detalle)
      ? detalle.map((d) => d.msg).join(' | ')
      : typeof detalle === 'string'
        ? detalle
        : ''
    return `El servidor rechazó los datos enviados${motivo ? `: ${motivo}` : ''}.`
  }
  if (estado === 429) {
    return 'Demasiadas peticiones seguidas al servidor (el límite es de 5 por minuto). Espere un minuto e intente nuevamente.'
  }
  if (estado >= 500) {
    return `Error interno del servidor (${estado}). Revise la consola del backend.`
  }
  return `El servidor respondió con un error (${estado}).`
}

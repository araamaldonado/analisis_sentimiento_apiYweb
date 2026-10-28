// Descarga de resultados en formato JSON:
// [{ "comentario": "...", "sentimiento": "neutral", "confianza": "96%" }, ...]

const porcentajeEntero = (confianza) => `${Math.round(confianza * 100)}%`

// items: [{ texto, etiqueta, confianza, error? }]
// Un texto que no se pudo analizar se guarda con su motivo en lugar de sentimiento/confianza,
// para que el archivo tenga siempre una fila por texto.
export function armarFilas(items) {
  return items.map((item) =>
    item.error
      ? { comentario: item.texto, error: item.error }
      : {
          comentario: item.texto,
          sentimiento: item.etiqueta.toLowerCase(),
          confianza: porcentajeEntero(item.confianza),
        },
  )
}

// "comentarios.txt" -> "comentarios_resultados.json"
export function nombreResultados(nombreArchivo) {
  const base = nombreArchivo.replace(/\.[^.]+$/, '')
  return `${base}_resultados.json`
}

export function descargarJSON(items, nombreArchivo) {
  const contenido = JSON.stringify(armarFilas(items), null, 2)
  const blob = new Blob([contenido], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()

  setTimeout(() => URL.revokeObjectURL(url), 0)
}

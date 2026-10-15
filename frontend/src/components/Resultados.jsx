import cargaUno from '../assets/carga_1.svg'
import cargaDos from '../assets/carga_2.svg'
import cargaTres from '../assets/carga_3.svg'

const porcentaje = (confianza) => `${(confianza * 100).toFixed(1)}%`
const recortar = (texto, max = 70) =>
  texto.length > max ? `${texto.slice(0, max)}…` : texto

// ---------- Animación de carga: lupa, signo de pregunta y carita ^_^ ----------
export function Cargando({ mensaje }) {
  return (
    <span className="cargando-wrap">
      <span className="cargando" role="status" aria-label="Analizando el texto">
        <img src={cargaUno} alt="" />
        <img src={cargaDos} alt="" />
        <img src={cargaTres} alt="" />
      </span>
      {mensaje && <small className="cargando-mensaje">{mensaje}</small>}
    </span>
  )
}

// ---------- Resultado de un solo texto (puede estar dividido en partes) ----------
export function ResultadoTexto({ cargando, progreso, error, resultado }) {
  if (cargando) return <Cargando mensaje={progreso} />
  if (error) return <p className="error">{error}</p>

  if (resultado) {
    const varias = resultado.partes.length > 1
    return (
      <>
        <p className="veredicto">
          {varias ? 'Sentimiento general' : 'Sentimiento'}: {resultado.etiqueta} (confianza:{' '}
          {porcentaje(resultado.confianza)})
        </p>
        {varias && (
          <details>
            <summary>Ver detalle por partes ({resultado.partes.length})</summary>
            <ol className="detalle">
              {resultado.partes.map((p, i) => (
                <li key={i}>
                  <strong>{p.etiqueta}</strong> ({porcentaje(p.confianza)}) — “{recortar(p.texto)}”
                </li>
              ))}
            </ol>
          </details>
        )}
      </>
    )
  }

  return <p className="veredicto">Aquí podrá ver el resultado.</p>
}

// ---------- Resultado de un archivo con varios textos ----------
export function ResultadoLote({ cargando, progreso, error, lote }) {
  if (cargando) return <Cargando mensaje={progreso} />

  let contenido = null
  if (lote) {
    const correctos = lote.items.filter((item) => !item.error)
    const fallidos = lote.items.length - correctos.length

    const conteo = {}
    correctos.forEach((item) => {
      conteo[item.etiqueta] = (conteo[item.etiqueta] ?? 0) + 1
    })
    const resumen = Object.entries(conteo).sort((a, b) => b[1] - a[1])

    contenido = (
      <>
        <p className="veredicto">
          {lote.parcial ? 'Resultado parcial. ' : ''}
          Archivo “{lote.archivo}”: {correctos.length} de {lote.items.length} textos analizados
          {fallidos > 0 ? ` (${fallidos} con error)` : ''}.
        </p>

        {resumen.length > 0 && (
          <ul className="resumen">
            {resumen.map(([etiqueta, cantidad]) => (
              <li key={etiqueta}>
                {etiqueta}: {cantidad} ({Math.round((cantidad / correctos.length) * 100)}%)
              </li>
            ))}
          </ul>
        )}

        <details>
          <summary>Ver detalle de cada texto</summary>
          <ul className="detalle">
            {lote.items.map((item, i) => (
              <li key={i}>
                <strong>#{item.id}</strong> — “{recortar(item.texto)}”
                <br />
                {item.error ? (
                  <span className="error">{item.error}</span>
                ) : (
                  <>
                    <strong>{item.etiqueta}</strong> ({porcentaje(item.confianza)})
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      </>
    )
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      {contenido}
      {!error && !lote && (
        <p className="veredicto">Aquí podrá ver el resultado del archivo.</p>
      )}
    </>
  )
}

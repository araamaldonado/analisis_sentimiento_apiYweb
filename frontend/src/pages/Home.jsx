import { useEffect, useMemo, useRef, useState } from 'react'
import { apisentiment_batch_fetch } from '../../services/sentiment.service'
import { ResultadoTexto, ResultadoLote } from '../components/Resultados'
import {
  MAX_CHARS,
  MAX_PARTES,
  MAX_ITEMS,
  MAX_BYTES,
  ErrorValidacion,
  ErrorCancelado,
  dividirTexto,
  combinarResultados,
  leerArchivo,
  validarTexto,
} from '../utils/texto'

const MENSAJE_ERROR = 'No se pudo analizar el texto. Intente nuevamente.'
const UMBRAL_ALERTA = MAX_CHARS * 0.9

function Home() {
  const [vista, setVista] = useState('normal') // 'normal' | 'extendido' (dentro de la card)
  const [text, setText] = useState('')
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [lote, setLote] = useState(null)
  const [errorLote, setErrorLote] = useState('')
  const [cargando, setCargando] = useState(null) // null | 'texto' | 'lote'
  const [progreso, setProgreso] = useState('')
  const cancelar = useRef(false)

  // Si se sale de la página (por ejemplo a Info) en medio de un análisis, se detiene
  useEffect(() => {
    return () => {
      cancelar.current = true
    }
  }, [])

  const handleCancelar = () => {
    cancelar.current = true;
    setCargando(null);
    setProgreso('');
    setError('Análisis cancelado.');
    setErrorLote('Análisis cancelado.');

    setTimeout(() => {
      setError("")
      setErrorLote("")
      setResultado(null)
      setLote(null)
      }, 3500)
  };

  // Partes en las que se dividiría el texto actual (cada una de hasta MAX_CHARS)
  const partes = useMemo(() => dividirTexto(text), [text])
  const largoParteActual = partes.length ? partes[partes.length - 1].length : 0

  
  const analizarTexto = async (texto) => {
  const partesTexto = dividirTexto(texto)

  if (partesTexto.length === 0) {
    throw new ErrorValidacion('Escriba o pegue un texto para analizar.')
  }
  if (partesTexto.length > MAX_PARTES) {
    throw new ErrorValidacion(
      `El texto es demasiado largo (máximo ${MAX_PARTES} partes de ${MAX_CHARS} caracteres).`,
    )
  }
  const mensaje = validarTexto(texto) // la función que te pasé antes
  if (mensaje) throw new ErrorValidacion(mensaje)
  if (cancelar.current) throw new ErrorCancelado()

  const respuestas = await apisentiment_batch_fetch(partesTexto)

  if (cancelar.current) throw new ErrorCancelado()

  // Una parte sin palabras no tumba el análisis: se descarta si hay otras válidas
  const porParte = respuestas.filter((r) => !r.error)
  if (porParte.length === 0) throw new ErrorValidacion(respuestas[0].error)

  return { ...combinarResultados(porParte), partes: porParte }
}

  // ----- Un solo texto (corto o largo) -----
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cargando) return

    cancelar.current = false
    setError('')
    setResultado(null)
    setProgreso('')
    setCargando('texto')

    try {
      const r = await analizarTexto(text, (actual, total) =>
        setProgreso(total > 1 ? `Analizando parte ${actual}/${total}` : ''),
      )
      setResultado(r)
    } catch (err) {
      if (err instanceof ErrorCancelado) {
        setError('Análisis cancelado.')
      } else if (err instanceof ErrorValidacion) {
        setError(err.message)
      } else {
        console.error(err)
        setError(MENSAJE_ERROR)
      }
    } finally {
      setCargando(null)
      setProgreso('')
    }
  }

  // ----- Varios textos desde un archivo (.json o .txt) -----
  const handleArchivo = async (e) => {
    if (cargando) return
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    cancelar.current = false
    setErrorLote('')
    setLote(null)
    setProgreso('')
    setCargando('lote')

    try {
      if (archivo.size > MAX_BYTES) {
        throw new ErrorValidacion(
          `El archivo es demasiado grande (máximo ${MAX_BYTES / 1024 / 1024} MB).`,
        )
      }

      const items = leerArchivo(archivo.name, await archivo.text())
      if (items.length > MAX_ITEMS) {
        throw new ErrorValidacion(`El archivo tiene ${items.length} textos y el máximo es ${MAX_ITEMS}.`)
      }

      setProgreso(`Analizando ${items.length} textos...`)

      // Extraemos solo los textos en un array plano
      const listaTextos = items.map(item => item.texto)

      // ¡UNA SOLA PETICIÓN POST PARA TODO EL ARCHIVO ENTERO!
      const resultadosLote = await apisentiment_batch_fetch(listaTextos)

      if (cancelar.current) throw new ErrorCancelado()

      // Combinamos cada resultado con su respectivo item original
      const analizados = items.map((item, index) => ({
        ...item,
        etiqueta: resultadosLote[index].etiqueta,
        confianza: resultadosLote[index].confianza
      }))

      setLote({ archivo: archivo.name, items: analizados })

    } catch (err) {
      if (err instanceof ErrorCancelado) {
        setErrorLote('Análisis cancelado.')
      } else if (err instanceof ErrorValidacion) {
        setErrorLote(err.message)
      } else {
        console.error(err)
        setErrorLote('No se pudo leer o analizar el archivo.')
      }
    } finally {
      setCargando(null)
      setProgreso('')
    }
  }

  const botonCancelar = (
    <button
      type="button"
      className="btn btn-outline"
      onClick={handleCancelar}
    >
      Cancelar
    </button>
  )

  return (
    <>
      <section className="intro">
        <h2>Inserte aquí el texto que quiera analizar.</h2>
        <p>¡Es fácil! Solo escriba o pegue en el cuadro de texto debajo, Ana Lisa hará el resto.</p>
      </section>

      {/* Card principal: es lo único que cambia de contenido */}
      <section className="analyzer">
        {vista === 'normal' ? (
          <form className="vista" onSubmit={handleSubmit}>
            <div className="campo">
              <label htmlFor="texto" className="sr-only">Texto a analizar</label>
              <textarea
                id="texto"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escriba o pegue su texto aquí..."
                rows={6}
                aria-describedby="contador-texto"
              ></textarea>
              <span
                id="contador-texto"
                className={`contador${largoParteActual >= UMBRAL_ALERTA ? ' contador--alerta' : ''}`}
              >
                {largoParteActual}/{MAX_CHARS} caracteres
                {partes.length > 1 && ` (parte ${partes.length}/${partes.length})`}
              </span>
            </div>

            {partes.length > 1 && (
              <p className="aviso">
                {partes.length <= MAX_PARTES
                  ? `Su texto es largo: se analizará en ${partes.length} partes y se mostrará un resultado general.`
                  : `Su texto supera el máximo de ${MAX_PARTES} partes. Acórtelo para poder analizarlo.`}
              </p>
            )}

            <div className="acciones">
              <button type="submit" className="btn btn-secondary" disabled={Boolean(cargando)}>
                Analizar
              </button>
              {cargando === 'texto' && botonCancelar}
            </div>

            <div className="resultado" aria-live="polite">
              <ResultadoTexto
                cargando={cargando === 'texto'}
                progreso={progreso}
                error={error}
                resultado={resultado}
              />
            </div>

            <div className="extender">
              <p>¿Quiere analizar varios textos seguidos?</p>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setVista('extendido')}
                disabled={Boolean(cargando)}
              >
                Análisis extendido
              </button>
            </div>
          </form>
        ) : (
          <div className="vista">
            <button
              type="button"
              className="volver"
              onClick={() => setVista('normal')}
              disabled={Boolean(cargando)}
            >
              <span aria-hidden="true">‹</span> Regresar a análisis normal
            </button>

            <h2>Analizar varios textos</h2>
            <p className="descripcion">
              Suba un archivo con los textos (por ejemplo, comentarios de un foro) y Ana Lisa
              los analizará uno por uno.
            </p>

            <details className="formato">
              <summary>¿Qué formato debe tener el archivo?</summary>
              <p>
                <strong>.json</strong>: una lista de textos, o de objetos con un campo{' '}
                <code>texto</code> (y opcionalmente <code>id</code>).
              </p>
              {/* Tuvo que quedar asi para que quede prolijo escrito en la pagina */}
              <pre>
                {`[
    { "id": 1, "texto": "Me encantó el producto" },
    { "id": 2, "texto": "Llegó roto y nadie responde" }       
]`}
              </pre>
              <p>
                <strong>.txt</strong>: un texto por línea.
              </p>
              <p>
                Máximo {MAX_ITEMS} textos y {MAX_BYTES / 1024 / 1024} MB por archivo. Los textos
                de más de {MAX_CHARS} caracteres se dividen en partes automáticamente.
              </p>
            </details>

            <div className="acciones">
              <input
                id="archivo"
                type="file"
                accept=".json,.txt,application/json,text/plain"
                className="sr-only file-input"
                onChange={handleArchivo}
                disabled={Boolean(cargando)}
              />
              <label htmlFor="archivo" className="btn btn-outline btn-file">
                Subir archivo
              </label>
              {cargando === 'lote' && botonCancelar}
            </div>

            <div className="resultado" aria-live="polite">
              <ResultadoLote
                cargando={cargando === 'lote'}
                progreso={progreso}
                error={errorLote}
                lote={lote}
              />
            </div>
          </div>
        )}
      </section>
    </>
  )
}

export default Home

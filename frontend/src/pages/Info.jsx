import { Link } from 'react-router-dom'
import { MAX_CHARS, MAX_ITEMS } from '../utils/texto'

function Info() {
  return (
    <section className="info-card">
      <h2>¿Cómo funciona el análisis?</h2>
      <p>
        Ana Lisa usa un modelo de lenguaje preentrenado para español (<a href="https://huggingface.co/pysentimiento/robertuito-sentiment-analysis" target="_blank">RoBERTuito</a>) 
        que lee el texto y lo clasifica como <strong>positivo</strong>, <strong>negativo</strong> o{' '}
        <strong>neutral</strong>, junto con un porcentaje de confianza.
      </p>

      <h3>Textos largos</h3>
      <p>
        El modelo solo puede leer fragmentos cortos, así que los textos de más de {MAX_CHARS}{' '}
        caracteres se dividen en partes. Cada parte se analiza por separado y después se
        combinan los resultados en uno general: pesan más las partes más largas y las que el
        modelo clasificó con mayor confianza.
      </p>

      <h3>Varios textos a la vez</h3>
      <p>
        Desde el <strong>análisis extendido</strong> podés subir un archivo <code>.json</code> o{' '}
        <code>.txt</code> con hasta {MAX_ITEMS} textos. Ana Lisa los analiza uno por uno y
        muestra un resumen con la cantidad de cada sentimiento.
      </p>

      <h3>Algo a tener en cuenta</h3>
      <p>
        El modelo se entrenó principalmente con mensajes cortos y coloquiales, así que
        rinde mejor con ese tipo de textos.
      </p>
      <p>
        Aun así, no siempre detecta el sarcasmo ni la ironía, por lo que esos textos
        pueden dar resultados erróneos. Ana Lisa es una herramienta de apoyo: sus
        resultados son estimaciones, no verdades absolutas.
      </p>

      <p>
        <Link to="/">‹ Volver al análisis</Link>
      </p>
    </section>
  )
}

export default Info

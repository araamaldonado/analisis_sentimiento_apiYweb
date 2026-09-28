import { use, useState } from 'react'
import './App.css'
import { apisentiment_fetch } from '../services/sentiment.service'

function App() {
  const [text, setText] = useState("")
  const [resultado, setResultado] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try{
      const data = await apisentiment_fetch(text)
      setResultado(data)
    }catch(err){
      console.error(err)
    }
  }

  return (
    <>
    <header></header>
    <main>
      <h1>Analisis de sentimiento</h1>

      <h2>Inserte aquí el texto que quiera analizar.</h2>
      <p>¡Es fácil! Solo escriba o pegue en el cuadro de texto debajo, nosotros haremos el resto.</p>

      <form onSubmit={handleSubmit}>

        <textarea value={text} onChange={(e) => setText(e.target.value)}></textarea>
        
        <button type='submit' className='btn btn-secondary'>Analizar</button>

      </form>
      <span>
        { resultado ? `Sentimiento: ${resultado.etiqueta} (confianza: ${(resultado.confianza * 100).toFixed(1)}%)` : "Aquí podra ver el resultado." }
      </span>
      <h2>¿Como funciona el análisis?</h2>
      <p>Lorem, ipsum dolor.</p>
    </main>
    <footer>
      <p>Copyright @2026 Araceli Maldonado. Todos los derechos reservados.</p>
    </footer>
    </>
  )
}

export default App

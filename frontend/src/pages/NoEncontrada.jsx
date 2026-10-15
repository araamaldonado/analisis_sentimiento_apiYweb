import { Link } from 'react-router-dom'

function NoEncontrada() {
  return (
    <section className="info-card">
      <h2>UPS! Página no encontrada</h2>
      <p>La dirección que buscás no existe (T_T)</p>
      <p>
        <Link to="/">‹ Volver al inicio</Link>
      </p>
    </section>
  )
}

export default NoEncontrada

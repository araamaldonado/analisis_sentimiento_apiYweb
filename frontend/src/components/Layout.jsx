import { useLayoutEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import anaLisaLogo from '../assets/analisa_logo.png'

const CLAVE_TEMA = 'analisa-tema'

// Tema guardado en el navegador (por defecto, claro)
function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA)
    if (guardado === 'claro' || guardado === 'oscuro') return guardado
  } catch {
    /* sin acceso a localStorage: se usa el tema claro */
  }
  return 'claro'
}

// Estructura que comparten todas las páginas: logo, menú, contenido (<Outlet />) y footer
function Layout() {
  const [tema, setTema] = useState(temaInicial)

  // Aplica el tema antes de pintar la pantalla y lo recuerda
  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema
    try {
      localStorage.setItem(CLAVE_TEMA, tema)
    } catch {
      /* sin acceso a localStorage: el tema solo vale para esta visita */
    }
  }, [tema])

  const alternarTema = () => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))

  return (
    <>
      <header className="site-header">
        <img src={anaLisaLogo} alt="AnaLisa Logo" />
      </header>

      <main className="site-main">
        <nav className="site-nav" aria-label="Menú principal">
          <NavLink to="/" end>Home</NavLink>
          <span aria-hidden="true">|</span>
          <NavLink to="/info">Info</NavLink>
          <span aria-hidden="true">|</span>
          <button type="button" className="tema-btn" onClick={alternarTema}>
            {tema === 'oscuro' ? '☀️ Modo claro' : '🌙 Modo nocturno'}
          </button>
        </nav>

        {/* Acá se dibuja la página que corresponda a la ruta */}
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>Copyright @2026 Araceli Maldonado. Todos los derechos reservados.</p>
      </footer>
    </>
  )
}

export default Layout

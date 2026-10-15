import { Routes, Route } from 'react-router-dom'
import './App.css'
import Layout from './components/Layout'
import Home from './pages/Home'
import Info from './pages/Info'
import NoEncontrada from './pages/NoEncontrada'

// Acá solo se declaran las rutas. Para sumar una página nueva:
// 1) crear el archivo en src/pages/  2) agregar una <Route>  3) agregar el link en Layout.jsx
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="info" element={<Info />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}

export default App

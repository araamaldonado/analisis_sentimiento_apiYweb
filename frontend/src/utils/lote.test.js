import { describe, it, expect, vi } from 'vitest'
import { analizarLote, mensajeErrorServidor, MAX_POR_PETICION } from './lote.js'
import { ErrorCancelado, ErrorValidacion } from './texto.js'

// Servidor falso: devuelve "Positivo" salvo que el texto diga "malo"
const servidorFalso = async (textos) =>
  textos.map((t) => ({ etiqueta: t.includes('malo') ? 'Negativo' : 'Positivo', confianza: 0.9 }))

const item = (id, texto = 'Me encantó el producto') => ({ id, texto })

describe('analizarLote', () => {
  it('marca con error un texto sin palabras y no lo envía al servidor', async () => {
    const enviados = []
    const servidor = async (textos) => {
      enviados.push(...textos)
      return servidorFalso(textos)
    }
    const res = await analizarLote([item(1, '!!! ???'), item(2)], servidor)

    expect(res[0].error).toBeTruthy()
    expect(res[1].etiqueta).toBe('Positivo')
    expect(enviados).toEqual(['Me encantó el producto'])
  })

  it('envía los textos en tandas de MAX_POR_PETICION', async () => {
    const servidor = vi.fn(servidorFalso)
    const items = Array.from({ length: 250 }, (_, i) => item(i, `Me encantó el producto ${i}`))

    await analizarLote(items, servidor)

    const tamanos = servidor.mock.calls.map(([textos]) => textos.length)
    expect(tamanos).toEqual([MAX_POR_PETICION, MAX_POR_PETICION, 250 - 2 * MAX_POR_PETICION])
  })

  it('mantiene el orden de los resultados', async () => {
    const items = [item(1, 'Me encantó'), item(2, 'Es muy malo'), item(3, 'Me encantó mucho')]
    const res = await analizarLote(items, servidorFalso)

    expect(res.map((r) => r.id)).toEqual([1, 2, 3])
    expect(res.map((r) => r.etiqueta)).toEqual(['Positivo', 'Negativo', 'Positivo'])
  })

  it('pasa la señal de cancelación al servidor', async () => {
    const servidor = vi.fn(servidorFalso)
    const { signal } = new AbortController()

    await analizarLote([item(1)], servidor, { signal })

    expect(servidor).toHaveBeenCalledWith(expect.any(Array), signal)
  })

  it('lanza ErrorCancelado si se cancela', async () => {
    await expect(
      analizarLote([item(1)], servidorFalso, { estaCancelado: () => true }),
    ).rejects.toBeInstanceOf(ErrorCancelado)
  })

  it('lanza ErrorValidacion si el servidor devuelve otra cantidad de resultados', async () => {
    await expect(analizarLote([item(1)], async () => [])).rejects.toBeInstanceOf(ErrorValidacion)
  })

  it('deja con error al texto cuyas partes fallaron todas', async () => {
    const res = await analizarLote([item(1)], async () => [{ error: 'No se pudo analizar' }])

    expect(res[0].error).toBe('No se pudo analizar')
    expect(res[0].partes).toBeUndefined()
  })
})

describe('mensajeErrorServidor', () => {
  it('traduce los errores de red y de tiempo', () => {
    expect(mensajeErrorServidor({ code: 'ERR_NETWORK' })).toContain('No se pudo conectar')
    expect(mensajeErrorServidor({ code: 'ECONNABORTED' })).toContain('tardó demasiado')
  })

  it('traduce los errores HTTP', () => {
    const detalle = [{ msg: 'demasiados textos' }]
    expect(mensajeErrorServidor({ response: { status: 422, data: { detail: detalle } } }))
      .toContain('demasiados textos')
    expect(mensajeErrorServidor({ response: { status: 429 } })).toContain('30 por minuto')
    expect(mensajeErrorServidor({ response: { status: 500 } })).toContain('500')
  })

  it('devuelve null si no es un error de servidor ni de red', () => {
    expect(mensajeErrorServidor({ code: 'ERR_CANCELED' })).toBeNull()
  })
})
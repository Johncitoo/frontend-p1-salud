// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { formatFileSize, validateDocumentoAdjuntoFile } from './documentosAdjuntosApi'

const makeFile = (name: string, type: string, size = 128) =>
  new File([new Uint8Array(size)], name, { type })

describe('documentosAdjuntosApi helpers', () => {
  it('accepts classic clinical document formats', () => {
    expect(validateDocumentoAdjuntoFile(makeFile('receta.pdf', 'application/pdf'))).toBeNull()
    expect(validateDocumentoAdjuntoFile(makeFile('foto.jpg', 'image/jpeg'))).toBeNull()
    expect(validateDocumentoAdjuntoFile(makeFile('foto.png', 'image/png'))).toBeNull()
    expect(validateDocumentoAdjuntoFile(makeFile('foto.webp', 'image/webp'))).toBeNull()
  })

  it('rejects unsupported extensions', () => {
    expect(validateDocumentoAdjuntoFile(makeFile('malware.exe', 'application/octet-stream'))).toContain('Solo se permiten')
  })

  it('rejects mismatched MIME types', () => {
    const file = makeFile('foto.jpg', 'image/jpeg')
    Object.defineProperty(file, 'type', { value: 'application/pdf' })

    expect(validateDocumentoAdjuntoFile(file)).toContain('tipo del archivo')
  })

  it('rejects oversized images and PDFs', () => {
    expect(validateDocumentoAdjuntoFile(makeFile('foto.png', 'image/png', 10 * 1024 * 1024 + 1))).toContain('10 MB')
    expect(validateDocumentoAdjuntoFile(makeFile('examen.pdf', 'application/pdf', 15 * 1024 * 1024 + 1))).toContain('15 MB')
  })

  it('formats file sizes for the panel', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(String(2 * 1024 * 1024))).toBe('2.0 MB')
    expect(formatFileSize(null)).toBe('Sin tamaño')
  })
})

import { apiDelete, apiGet, apiGetBlob, apiPostForm } from '@/lib/api'

export const DOCUMENTO_CATEGORIAS = [
  'GENERAL',
  'FOTO_CLINICA',
  'CONSENTIMIENTO',
  'INDICACION',
  'EXAMEN',
  'OTRO',
] as const

export type DocumentoCategoria = (typeof DOCUMENTO_CATEGORIAS)[number]

export type DocumentoAdjunto = {
  id: string
  fichaClinicaId: string
  nombreArchivo: string
  tipoArchivo?: string | null
  mimeType?: string | null
  tamanoBytes?: string | null
  descripcion?: string | null
  estado: string
  categoria: DocumentoCategoria | string
  fueOptimizado?: boolean
  extensionOriginal?: string | null
  extensionAlmacenada?: string | null
  tamanoOriginalBytes?: string | null
  tamanoAlmacenadoBytes?: string | null
  mimeTypeOriginal?: string | null
  mimeTypeAlmacenado?: string | null
  createdAt: string
  updatedAt: string
}

export type UploadDocumentoAdjuntoInput = {
  fichaClinicaId: string
  file: File
  categoria: DocumentoCategoria
  descripcion?: string
}

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf'])
const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
}
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PDF_BYTES = 15 * 1024 * 1024

export function validateDocumentoAdjuntoFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return 'Solo se permiten archivos JPG, PNG, WebP o PDF.'
  }

  if (file.type && file.type !== EXTENSION_MIME[extension]) {
    return 'El tipo del archivo no coincide con los formatos permitidos.'
  }

  const isPdf = extension === 'pdf'
  const maxBytes = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
  if (file.size > maxBytes) {
    return isPdf ? 'El PDF no puede superar 15 MB.' : 'La imagen no puede superar 10 MB.'
  }

  return null
}

export const formatFileSize = (bytes?: string | number | null) => {
  const value = typeof bytes === 'string' ? Number(bytes) : bytes
  if (!value || Number.isNaN(value)) return 'Sin tamaño'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export const listDocumentosAdjuntos = (fichaClinicaId: string) =>
  apiGet<DocumentoAdjunto[]>(`/documentos-adjuntos?fichaClinicaId=${encodeURIComponent(fichaClinicaId)}`)

export const uploadDocumentoAdjunto = (input: UploadDocumentoAdjuntoInput) => {
  const formData = new FormData()
  formData.set('fichaClinicaId', input.fichaClinicaId)
  formData.set('categoria', input.categoria)
  if (input.descripcion?.trim()) formData.set('descripcion', input.descripcion.trim())
  formData.set('file', input.file)

  return apiPostForm<DocumentoAdjunto>('/documentos-adjuntos', formData)
}

export const downloadDocumentoAdjunto = (id: string) =>
  apiGetBlob(`/documentos-adjuntos/${id}/download`)

export const deleteDocumentoAdjunto = (id: string) =>
  apiDelete<DocumentoAdjunto>(`/documentos-adjuntos/${id}`)

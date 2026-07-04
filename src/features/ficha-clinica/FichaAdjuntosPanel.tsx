import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Download, FileText, Image, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import {
  deleteDocumentoAdjunto,
  DOCUMENTO_CATEGORIAS,
  downloadDocumentoAdjunto,
  formatFileSize,
  listDocumentosAdjuntos,
  type DocumentoAdjunto,
  type DocumentoCategoria,
  uploadDocumentoAdjunto,
  validateDocumentoAdjuntoFile,
} from './documentosAdjuntosApi'

type FichaAdjuntosPanelProps = {
  fichaClinicaId?: string | null
  isClosed?: boolean
}

const categoryLabels: Record<DocumentoCategoria, string> = {
  GENERAL: 'General',
  FOTO_CLINICA: 'Foto clínica',
  CONSENTIMIENTO: 'Consentimiento',
  INDICACION: 'Indicación',
  EXAMEN: 'Examen',
  OTRO: 'Otro',
}

const canUploadRoles = new Set(['ADMIN', 'COORDINADOR', 'PROFESIONAL'])
const canDeleteRoles = new Set(['ADMIN', 'COORDINADOR'])

const isImageDocument = (documento: DocumentoAdjunto) =>
  (documento.mimeTypeAlmacenado ?? documento.mimeType ?? '').startsWith('image/')

const FichaAdjuntosPanel = ({ fichaClinicaId, isClosed = false }: FichaAdjuntosPanelProps) => {
  const session = useCurrentUser()
  const userRole = session.profile?.rol ?? ''
  const canUpload = canUploadRoles.has(userRole) && !isClosed
  const canDelete = canDeleteRoles.has(userRole) && !isClosed

  const [documentos, setDocumentos] = useState<DocumentoAdjunto[]>([])
  const [categoria, setCategoria] = useState<DocumentoCategoria>('GENERAL')
  const [descripcion, setDescripcion] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const hasFicha = Boolean(fichaClinicaId)
  const selectedFileError = useMemo(
    () => (selectedFile ? validateDocumentoAdjuntoFile(selectedFile) : null),
    [selectedFile],
  )

  const loadDocumentos = async () => {
    if (!fichaClinicaId) {
      setDocumentos([])
      return
    }

    setIsLoading(true)
    setError('')
    try {
      setDocumentos(await listDocumentosAdjuntos(fichaClinicaId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los adjuntos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocumentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichaClinicaId])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSuccess('')
    setError('')
    setSelectedFile(event.target.files?.[0] ?? null)
  }

  const handleUpload = async () => {
    if (!fichaClinicaId || !selectedFile || selectedFileError) return

    setIsUploading(true)
    setError('')
    setSuccess('')
    try {
      const created = await uploadDocumentoAdjunto({
        fichaClinicaId,
        file: selectedFile,
        categoria,
        descripcion,
      })
      setDocumentos(prev => [created, ...prev])
      setSelectedFile(null)
      setDescripcion('')
      setCategoria('GENERAL')
      setSuccess('Archivo adjuntado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (documento: DocumentoAdjunto) => {
    setBusyId(documento.id)
    setError('')
    try {
      const { blob, filename } = await downloadDocumentoAdjunto(documento.id)
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename || documento.nombreArchivo
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (documento: DocumentoAdjunto) => {
    const confirmed = window.confirm(`Eliminar ${documento.nombreArchivo}?`)
    if (!confirmed) return

    setBusyId(documento.id)
    setError('')
    setSuccess('')
    try {
      await deleteDocumentoAdjunto(documento.id)
      setDocumentos(prev => prev.filter(item => item.id !== documento.id))
      setSuccess('Archivo eliminado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el archivo.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className='mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div className='mb-5 flex flex-wrap items-center gap-3'>
        <span className='rounded-2xl bg-[#3C6E71]/10 p-3 text-[#284B63]'>
          <Paperclip className='size-5' />
        </span>
        <div className='flex-1'>
          <h2 className='m-0 text-xl font-semibold text-slate-900'>Archivos adjuntos</h2>
          <p className='mt-1 text-sm text-slate-500'>
            Documentos e imágenes clínicas vinculadas a esta ficha.
          </p>
        </div>
      </div>

      {!hasFicha && (
        <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          Guarda la ficha para habilitar archivos adjuntos.
        </div>
      )}

      {hasFicha && (
        <>
          {error && (
            <div className='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700'>
              {error}
            </div>
          )}
          {success && (
            <div className='mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800'>
              {success}
            </div>
          )}

          {canUpload && (
            <div className='mb-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.3fr_0.8fr]'>
              <label className='text-sm font-medium text-slate-700'>
                Archivo
                <input
                  type='file'
                  accept='.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'
                  onChange={handleFileChange}
                  className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#284B63] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white'
                />
                {selectedFile && (
                  <span className='mt-1 block text-xs text-slate-500'>
                    {selectedFile.name} · {formatFileSize(selectedFile.size)}
                  </span>
                )}
                {selectedFileError && <span className='mt-1 block text-xs font-semibold text-red-600'>{selectedFileError}</span>}
              </label>

              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
                <label className='text-sm font-medium text-slate-700'>
                  Categoría
                  <select
                    value={categoria}
                    onChange={event => setCategoria(event.target.value as DocumentoCategoria)}
                    className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
                  >
                    {DOCUMENTO_CATEGORIAS.map(option => (
                      <option key={option} value={option}>{categoryLabels[option]}</option>
                    ))}
                  </select>
                </label>
                <button
                  type='button'
                  onClick={handleUpload}
                  disabled={!selectedFile || Boolean(selectedFileError) || isUploading}
                  className='inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-[#284B63] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203C50] disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isUploading ? <Loader2 className='size-4 animate-spin' /> : <Upload className='size-4' />}
                  {isUploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>

              <label className='text-sm font-medium text-slate-700 lg:col-span-2'>
                Descripción
                <input
                  value={descripcion}
                  onChange={event => setDescripcion(event.target.value)}
                  maxLength={500}
                  placeholder='Detalle opcional del archivo'
                  className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
                />
              </label>
            </div>
          )}

          {isLoading ? (
            <p className='py-6 text-center text-sm text-slate-500'>Cargando adjuntos...</p>
          ) : documentos.length === 0 ? (
            <div className='rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500'>
              No hay archivos adjuntos en esta ficha.
            </div>
          ) : (
            <div className='overflow-hidden rounded-xl border border-slate-200'>
              {documentos.map(documento => (
                <div key={documento.id} className='grid gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center'>
                  <div className='flex min-w-0 items-start gap-3'>
                    <span className='mt-0.5 rounded-lg bg-slate-100 p-2 text-[#284B63]'>
                      {isImageDocument(documento) ? <Image className='size-4' /> : <FileText className='size-4' />}
                    </span>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-slate-900'>{documento.nombreArchivo}</p>
                      <p className='mt-1 text-xs text-slate-500'>
                        {categoryLabels[documento.categoria as DocumentoCategoria] ?? documento.categoria}
                        {' · '}
                        {documento.extensionAlmacenada?.toUpperCase() ?? documento.tipoArchivo?.toUpperCase() ?? 'ARCHIVO'}
                        {' · '}
                        {formatFileSize(documento.tamanoOriginalBytes ?? documento.tamanoBytes)}
                        {' · '}
                        {new Date(documento.createdAt).toLocaleDateString('es-CL', { dateStyle: 'medium' })}
                      </p>
                      {documento.descripcion && <p className='mt-1 text-xs text-slate-600'>{documento.descripcion}</p>}
                    </div>
                  </div>
                  <div className='flex items-center justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => handleDownload(documento)}
                      disabled={busyId === documento.id}
                      title='Descargar archivo'
                      className='inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {busyId === documento.id ? <Loader2 className='size-4 animate-spin' /> : <Download className='size-4' />}
                    </button>
                    {canDelete && (
                      <button
                        type='button'
                        onClick={() => handleDelete(documento)}
                        disabled={busyId === documento.id}
                        title='Eliminar archivo'
                        className='inline-flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        <Trash2 className='size-4' />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default FichaAdjuntosPanel

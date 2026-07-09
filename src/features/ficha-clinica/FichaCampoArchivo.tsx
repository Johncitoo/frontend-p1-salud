import { ChangeEvent, useEffect, useState } from 'react'
import { FileText, Loader2, Upload, Trash2, Download } from 'lucide-react'
import {
  type DocumentoAdjunto,
  uploadDocumentoAdjunto,
  deleteDocumentoAdjunto,
  listDocumentosAdjuntos,
  formatFileSize
} from './documentosAdjuntosApi'
import type { PlantillaCampoRow } from './fichaClinicaApi'

type FichaCampoArchivoProps = {
  fichaClinicaId?: string | null
  campo: PlantillaCampoRow
  value: string | File
  onChange: (value: string | File) => void
  isClosed?: boolean
  error?: string
}

export const FichaCampoArchivo = ({
  fichaClinicaId,
  campo,
  value,
  onChange,
  isClosed,
  error
}: FichaCampoArchivoProps) => {
  const [documentoInfo, setDocumentoInfo] = useState<DocumentoAdjunto | null>(null)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Cargar info del documento si el valor es un ID guardado (string)
  useEffect(() => {
    if (typeof value === 'string' && value && fichaClinicaId) {
      const fetchDocInfo = async () => {
        setIsLoadingDoc(true)
        try {
          const docs = await listDocumentosAdjuntos(fichaClinicaId)
          const doc = docs.find(d => d.id === value)
          if (doc) setDocumentoInfo(doc)
        } catch (err) {
          console.error('Error cargando info de documento', err)
        } finally {
          setIsLoadingDoc(false)
        }
      }
      fetchDocInfo()
    } else {
      setDocumentoInfo(null)
    }
  }, [value, fichaClinicaId])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(file)
    }
  }

  const handleUploadImmediate = async (fileToUpload: File) => {
    if (!fichaClinicaId) return
    setIsUploading(true)
    try {
      const doc = await uploadDocumentoAdjunto({
        fichaClinicaId,
        file: fileToUpload,
        categoria: 'GENERAL',
        descripcion: `Campo: ${campo.etiqueta}`
      })
      onChange(doc.id) // cambia el File por el ID final
      setDocumentoInfo(doc)
    } catch (err) {
      console.error('Upload failed', err)
      alert('Error al subir el archivo.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (isClosed) return
    
    if (typeof value === 'object') {
      // Solo era un File local
      onChange('')
      return
    }

    if (!documentoInfo) return
    if (!window.confirm('¿Seguro que deseas eliminar este archivo?')) return
    
    try {
      await deleteDocumentoAdjunto(documentoInfo.id)
      onChange('')
      setDocumentoInfo(null)
    } catch (err) {
      console.error('Delete failed', err)
      alert('Error al eliminar el archivo.')
    }
  }

  const isLocalFile = typeof value === 'object' && value instanceof File

  return (
    <div className='flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3'>
      <div>
        <span className='text-sm font-medium text-slate-700'>
          {campo.etiqueta}
          {campo.obligatorio && <span className='text-red-600 ml-1'>*</span>}
        </span>
        {campo.ayudaTexto && <p className='mt-1 text-xs text-slate-400'>{campo.ayudaTexto}</p>}
      </div>

      {documentoInfo ? (
        <div className='mt-2 flex items-center justify-between rounded border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center gap-3 overflow-hidden'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#284B63]'>
              <FileText className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold text-slate-700' title={documentoInfo.fileNameAlmacenado ?? documentoInfo.nombreOriginal}>
                {documentoInfo.fileNameAlmacenado ?? documentoInfo.nombreOriginal}
              </p>
              <p className='text-xs text-slate-500'>
                {formatFileSize(documentoInfo.tamanioBytes)}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <a
              href={`/api/v1/documentos-adjuntos/${documentoInfo.id}/download`}
              target='_blank'
              rel='noreferrer'
              title='Descargar archivo'
              className='grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            >
              <Download className='size-4' />
            </a>
            {!isClosed && (
              <button
                type='button'
                onClick={handleRemove}
                title='Eliminar archivo'
                className='grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600'
              >
                <Trash2 className='size-4' />
              </button>
            )}
          </div>
        </div>
      ) : isLocalFile ? (
        <div className='mt-2 flex flex-col gap-2'>
          <div className='flex items-center justify-between rounded border border-slate-200 bg-white p-3 shadow-sm'>
            <div className='flex items-center gap-3 overflow-hidden'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700'>
                <FileText className='size-5' />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-semibold text-slate-700' title={value.name}>
                  {value.name}
                </p>
                <p className='text-xs text-slate-500'>
                  (Pendiente de subir) - {formatFileSize(value.size)}
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={handleRemove}
              title='Quitar archivo'
              className='grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600'
            >
              <Trash2 className='size-4' />
            </button>
          </div>
          {fichaClinicaId && (
            <button
              type='button'
              onClick={() => handleUploadImmediate(value)}
              disabled={isUploading}
              className='self-end inline-flex h-9 items-center gap-2 rounded-full bg-[#3C6E71] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#284B63] disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isUploading ? <Loader2 className='size-4 animate-spin' /> : <Upload className='size-4' />}
              Subir ahora
            </button>
          )}
        </div>
      ) : isLoadingDoc ? (
        <div className='mt-2 flex items-center gap-2 text-sm text-slate-500'>
          <Loader2 className='size-4 animate-spin' /> Cargando archivo adjunto...
        </div>
      ) : (
        <div className='mt-2 flex items-end gap-2'>
          <div className='flex-1'>
            <input
              type='file'
              onChange={handleFileChange}
              disabled={isClosed}
              className='block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-[#284B63]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#284B63] hover:file:bg-[#284B63]/20 disabled:opacity-50'
            />
          </div>
        </div>
      )}
      
      {error && <span className='mt-1 block text-xs text-red-600'>{error}</span>}
    </div>
  )
}

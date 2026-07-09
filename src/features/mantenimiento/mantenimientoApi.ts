import { apiGet, apiPost } from '@/lib/api'
import type { RepuestoCatalogo, InspeccionMantenimiento, CreateInspeccionInput } from './types'

export const getRepuestosCatalogo = async () =>
  await apiGet<RepuestoCatalogo[]>('/mantenimiento/repuestos')

export const getInspecciones = async () =>
  await apiGet<InspeccionMantenimiento[]>('/mantenimiento/inspecciones')

// Paso 9 + 10: registra la inspección y dispara el pedido de repuestos a Proyecto 3.
export const createInspeccion = async (input: CreateInspeccionInput) =>
  await apiPost<InspeccionMantenimiento, CreateInspeccionInput>('/mantenimiento/inspecciones', input)

// Reintenta el pedido a Proyecto 3 si el primer intento falló (P3 caído / sin stock).
export const reintentarPedido = async (id: string) =>
  await apiPost<InspeccionMantenimiento, Record<string, never>>(
    `/mantenimiento/inspecciones/${id}/reintentar-pedido`,
    {},
  )

// Paso 14: el técnico instaló los componentes y cierra la orden de trabajo.
export const finalizarIntervencion = async (id: string, notas?: string) =>
  await apiPost<InspeccionMantenimiento, { notas?: string }>(
    `/mantenimiento/inspecciones/${id}/finalizar`,
    { notas },
  )

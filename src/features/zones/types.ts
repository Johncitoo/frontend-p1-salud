export type ZoneRow = {
  id: string
  nombre: string
  descripcion: string | null
  comuna: string
  region: string
  activa: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type ZoneFormValues = {
  nombre: string
  descripcion: string
  comuna: string
  region: string
  activa: boolean
}

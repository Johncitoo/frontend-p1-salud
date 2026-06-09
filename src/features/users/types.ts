export type RoleOption = {
  id: string
  nombre: string
  descripcion?: string | null
}

export type UserRow = {
  id: string
  identityUserId: string
  rolId: string
  rol: string | null
  rut: string
  nombres: string
  apellidos: string
  email: string
  telefono: string | null
  activo: boolean
  ultimoAccesoAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

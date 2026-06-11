-- =========================================================
-- BASE DE DATOS COMPLETA
-- Proyecto 1: Plataforma de gestión de atención primaria
-- de salud domiciliaria
--
-- Tecnologías pensadas:
-- PostgreSQL + NestJS + API REST + React + React Native
--
-- Incluye:
-- CORE
-- P0: núcleo clínico y trazabilidad
-- P1: agenda operativa interna
-- Ficha clínica híbrida: JSONB flexible + variables clínicas normalizadas
--
-- NO incluye todavía:
-- - Gobernanza clínica avanzada
-- - Protocolos clínicos y checklists
-- - Consentimientos informados
-- - Evaluación avanzada de prioridad clínica
-- - Integración IoT/sensores real
-- - Exportación real a analítica externa
-- - Notificaciones externas
-- =========================================================

BEGIN;

-- =========================================================
-- EXTENSIÓN PARA UUID
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- FUNCIÓN GENERAL updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- CORE
-- =========================================================

-- =========================================================
-- TABLA: roles
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_nombre
ON roles(nombre);

CREATE INDEX IF NOT EXISTS idx_roles_deleted_at
ON roles(deleted_at);

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: zonas
-- =========================================================

CREATE TABLE IF NOT EXISTS zonas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    comuna VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zonas_comuna
ON zonas(comuna);

CREATE INDEX IF NOT EXISTS idx_zonas_region
ON zonas(region);

CREATE INDEX IF NOT EXISTS idx_zonas_deleted_at
ON zonas(deleted_at);

DROP TRIGGER IF EXISTS trg_zonas_updated_at ON zonas;
CREATE TRIGGER trg_zonas_updated_at
BEFORE UPDATE ON zonas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: usuarios
-- =========================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    identity_user_id VARCHAR(100) NOT NULL,
    rol_id UUID NOT NULL,

    rut VARCHAR(20) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (rol_id)
        REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_identity_user_id
ON usuarios(identity_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_rut
ON usuarios(rut);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email
ON usuarios(email);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id
ON usuarios(rol_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at
ON usuarios(deleted_at);

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: pacientes
-- Se agrega direccion_principal_id después de crear direcciones_paciente,
-- para evitar dependencia circular.
-- =========================================================

CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rut VARCHAR(20) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    sexo VARCHAR(20),

    telefono VARCHAR(30),
    email VARCHAR(150),

    direccion TEXT,
    zona_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_pacientes_zonas
        FOREIGN KEY (zona_id)
        REFERENCES zonas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pacientes_rut
ON pacientes(rut);

CREATE INDEX IF NOT EXISTS idx_pacientes_zona_id
ON pacientes(zona_id);

CREATE INDEX IF NOT EXISTS idx_pacientes_deleted_at
ON pacientes(deleted_at);

DROP TRIGGER IF EXISTS trg_pacientes_updated_at ON pacientes;
CREATE TRIGGER trg_pacientes_updated_at
BEFORE UPDATE ON pacientes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: profesionales_salud
-- =========================================================

CREATE TABLE IF NOT EXISTS profesionales_salud (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    usuario_id UUID NOT NULL,

    profesion VARCHAR(50) NOT NULL,
    numero_registro VARCHAR(50),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_profesionales_salud_usuarios
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profesionales_usuario_id
ON profesionales_salud(usuario_id);

CREATE INDEX IF NOT EXISTS idx_profesionales_salud_usuario_id
ON profesionales_salud(usuario_id);

CREATE INDEX IF NOT EXISTS idx_profesionales_salud_deleted_at
ON profesionales_salud(deleted_at);

DROP TRIGGER IF EXISTS trg_profesionales_salud_updated_at ON profesionales_salud;
CREATE TRIGGER trg_profesionales_salud_updated_at
BEFORE UPDATE ON profesionales_salud
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: especialidades
-- =========================================================

CREATE TABLE IF NOT EXISTS especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_especialidades_nombre
ON especialidades(nombre);

CREATE INDEX IF NOT EXISTS idx_especialidades_deleted_at
ON especialidades(deleted_at);

DROP TRIGGER IF EXISTS trg_especialidades_updated_at ON especialidades;
CREATE TRIGGER trg_especialidades_updated_at
BEFORE UPDATE ON especialidades
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA INTERMEDIA: profesional_zona
-- =========================================================

CREATE TABLE IF NOT EXISTS profesional_zona (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    profesional_salud_id UUID NOT NULL,
    zona_id UUID NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_profesional_zona_profesional
        FOREIGN KEY (profesional_salud_id)
        REFERENCES profesionales_salud(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_profesional_zona_zona
        FOREIGN KEY (zona_id)
        REFERENCES zonas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profesional_zona
ON profesional_zona(profesional_salud_id, zona_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profesional_zona_profesional_salud_id
ON profesional_zona(profesional_salud_id);

CREATE INDEX IF NOT EXISTS idx_profesional_zona_zona_id
ON profesional_zona(zona_id);

CREATE INDEX IF NOT EXISTS idx_profesional_zona_deleted_at
ON profesional_zona(deleted_at);

DROP TRIGGER IF EXISTS trg_profesional_zona_updated_at ON profesional_zona;
CREATE TRIGGER trg_profesional_zona_updated_at
BEFORE UPDATE ON profesional_zona
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA INTERMEDIA: profesional_especialidad
-- =========================================================

CREATE TABLE IF NOT EXISTS profesional_especialidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    profesional_salud_id UUID NOT NULL,
    especialidad_id UUID NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_profesional_especialidad_profesional
        FOREIGN KEY (profesional_salud_id)
        REFERENCES profesionales_salud(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_profesional_especialidad_especialidad
        FOREIGN KEY (especialidad_id)
        REFERENCES especialidades(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profesional_especialidad
ON profesional_especialidad(profesional_salud_id, especialidad_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profesional_especialidad_profesional_salud_id
ON profesional_especialidad(profesional_salud_id);

CREATE INDEX IF NOT EXISTS idx_profesional_especialidad_especialidad_id
ON profesional_especialidad(especialidad_id);

CREATE INDEX IF NOT EXISTS idx_profesional_especialidad_deleted_at
ON profesional_especialidad(deleted_at);

DROP TRIGGER IF EXISTS trg_profesional_especialidad_updated_at ON profesional_especialidad;
CREATE TRIGGER trg_profesional_especialidad_updated_at
BEFORE UPDATE ON profesional_especialidad
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- P0
-- =========================================================

-- =========================================================
-- TABLA: planes_cuidado
-- Representa el seguimiento longitudinal del paciente.
-- =========================================================

CREATE TABLE IF NOT EXISTS planes_cuidado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    paciente_id UUID NOT NULL,
    profesional_responsable_id UUID,

    motivo_ingreso TEXT NOT NULL,
    objetivo_general TEXT,
    frecuencia_visitas TEXT,

    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',

    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_termino_estimada DATE,
    fecha_cierre DATE,

    creado_por_usuario_id UUID NOT NULL,
    cerrado_por_usuario_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_planes_cuidado_pacientes
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_planes_cuidado_profesional_responsable
        FOREIGN KEY (profesional_responsable_id)
        REFERENCES profesionales_salud(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_planes_cuidado_usuario_creador
        FOREIGN KEY (creado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_planes_cuidado_usuario_cierre
        FOREIGN KEY (cerrado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_planes_cuidado_estado
        CHECK (estado IN ('ACTIVO', 'PAUSADO', 'CERRADO', 'CANCELADO'))
);

CREATE INDEX IF NOT EXISTS idx_planes_cuidado_paciente_id
ON planes_cuidado(paciente_id);

CREATE INDEX IF NOT EXISTS idx_planes_cuidado_profesional_responsable_id
ON planes_cuidado(profesional_responsable_id);

CREATE INDEX IF NOT EXISTS idx_planes_cuidado_estado
ON planes_cuidado(estado);

CREATE INDEX IF NOT EXISTS idx_planes_cuidado_deleted_at
ON planes_cuidado(deleted_at);

DROP TRIGGER IF EXISTS trg_planes_cuidado_updated_at ON planes_cuidado;
CREATE TRIGGER trg_planes_cuidado_updated_at
BEFORE UPDATE ON planes_cuidado
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: prestaciones
-- Catálogo de prestaciones que pueden asignarse a una visita.
-- =========================================================

CREATE TABLE IF NOT EXISTS prestaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    duracion_estimada_min INTEGER,
    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT uq_prestaciones_codigo UNIQUE (codigo),
    CONSTRAINT uq_prestaciones_nombre UNIQUE (nombre),

    CONSTRAINT chk_prestaciones_duracion
        CHECK (duracion_estimada_min IS NULL OR duracion_estimada_min > 0)
);

CREATE INDEX IF NOT EXISTS idx_prestaciones_activa
ON prestaciones(activa);

CREATE INDEX IF NOT EXISTS idx_prestaciones_deleted_at
ON prestaciones(deleted_at);

DROP TRIGGER IF EXISTS trg_prestaciones_updated_at ON prestaciones;
CREATE TRIGGER trg_prestaciones_updated_at
BEFORE UPDATE ON prestaciones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- FICHA CLÍNICA HÍBRIDA
-- JSONB flexible + variables clínicas normalizadas.
-- =========================================================

-- =========================================================
-- TABLA: variables_clinicas
-- Catálogo centralizado de variables clínicas relevantes.
-- =========================================================

CREATE TABLE IF NOT EXISTS variables_clinicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(100) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    categoria VARCHAR(80),
    tipo_dato VARCHAR(30) NOT NULL,
    unidad VARCHAR(30),

    valor_minimo NUMERIC(12,4),
    valor_maximo NUMERIC(12,4),

    sinonimos TEXT[],
    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT uq_variables_clinicas_codigo UNIQUE (codigo),

    CONSTRAINT chk_variables_clinicas_tipo_dato
        CHECK (tipo_dato IN ('NUMERO', 'TEXTO', 'BOOLEANO', 'FECHA', 'JSON')),

    CONSTRAINT chk_variables_clinicas_rango
        CHECK (
            valor_minimo IS NULL
            OR valor_maximo IS NULL
            OR valor_minimo <= valor_maximo
        )
);

CREATE INDEX IF NOT EXISTS idx_variables_clinicas_codigo
ON variables_clinicas(codigo);

CREATE INDEX IF NOT EXISTS idx_variables_clinicas_nombre
ON variables_clinicas(nombre);

CREATE INDEX IF NOT EXISTS idx_variables_clinicas_categoria
ON variables_clinicas(categoria);

CREATE INDEX IF NOT EXISTS idx_variables_clinicas_activa
ON variables_clinicas(activa);

CREATE INDEX IF NOT EXISTS idx_variables_clinicas_deleted_at
ON variables_clinicas(deleted_at);

DROP TRIGGER IF EXISTS trg_variables_clinicas_updated_at ON variables_clinicas;
CREATE TRIGGER trg_variables_clinicas_updated_at
BEFORE UPDATE ON variables_clinicas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: plantillas_ficha
-- Plantillas reutilizables para fichas clínicas.
-- =========================================================

CREATE TABLE IF NOT EXISTS plantillas_ficha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(100) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo_atencion VARCHAR(80),

    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creada_por_usuario_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT uq_plantillas_ficha_codigo UNIQUE (codigo),

    CONSTRAINT fk_plantillas_ficha_usuario_creador
        FOREIGN KEY (creada_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plantillas_ficha_codigo
ON plantillas_ficha(codigo);

CREATE INDEX IF NOT EXISTS idx_plantillas_ficha_nombre
ON plantillas_ficha(nombre);

CREATE INDEX IF NOT EXISTS idx_plantillas_ficha_tipo_atencion
ON plantillas_ficha(tipo_atencion);

CREATE INDEX IF NOT EXISTS idx_plantillas_ficha_activa
ON plantillas_ficha(activa);

CREATE INDEX IF NOT EXISTS idx_plantillas_ficha_deleted_at
ON plantillas_ficha(deleted_at);

DROP TRIGGER IF EXISTS trg_plantillas_ficha_updated_at ON plantillas_ficha;
CREATE TRIGGER trg_plantillas_ficha_updated_at
BEFORE UPDATE ON plantillas_ficha
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- P1
-- =========================================================

-- =========================================================
-- TABLA: direcciones_paciente
-- Dirección estructurada del paciente.
-- Se crea antes de visitas para poder referenciarla desde visitas.
-- =========================================================

CREATE TABLE IF NOT EXISTS direcciones_paciente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    paciente_id UUID NOT NULL,
    zona_id UUID,

    tipo VARCHAR(30) NOT NULL DEFAULT 'DOMICILIO',

    calle VARCHAR(150),
    numero VARCHAR(30),
    departamento VARCHAR(50),
    villa_poblacion VARCHAR(150),

    comuna VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,

    referencia TEXT,

    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),

    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_direcciones_paciente_pacientes
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_direcciones_paciente_zonas
        FOREIGN KEY (zona_id)
        REFERENCES zonas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_direcciones_paciente_tipo
        CHECK (tipo IN ('DOMICILIO', 'TEMPORAL', 'CUIDADOR', 'OTRO')),

    CONSTRAINT chk_direcciones_paciente_latitud
        CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),

    CONSTRAINT chk_direcciones_paciente_longitud
        CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180))
);

CREATE INDEX IF NOT EXISTS idx_direcciones_paciente_paciente_id
ON direcciones_paciente(paciente_id);

CREATE INDEX IF NOT EXISTS idx_direcciones_paciente_zona_id
ON direcciones_paciente(zona_id);

CREATE INDEX IF NOT EXISTS idx_direcciones_paciente_comuna
ON direcciones_paciente(comuna);

CREATE INDEX IF NOT EXISTS idx_direcciones_paciente_region
ON direcciones_paciente(region);

CREATE INDEX IF NOT EXISTS idx_direcciones_paciente_deleted_at
ON direcciones_paciente(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_direcciones_paciente_principal
ON direcciones_paciente(paciente_id)
WHERE es_principal = TRUE AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_direcciones_paciente_updated_at ON direcciones_paciente;
CREATE TRIGGER trg_direcciones_paciente_updated_at
BEFORE UPDATE ON direcciones_paciente
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- MODIFICACIÓN: pacientes.direccion_principal_id
-- =========================================================

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS direccion_principal_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_pacientes_direccion_principal'
    ) THEN
        ALTER TABLE pacientes
        ADD CONSTRAINT fk_pacientes_direccion_principal
        FOREIGN KEY (direccion_principal_id)
        REFERENCES direcciones_paciente(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_pacientes_direccion_principal_id
ON pacientes(direccion_principal_id);

-- =========================================================
-- TABLA: motivos_cancelacion
-- =========================================================

CREATE TABLE IF NOT EXISTS motivos_cancelacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    aplica_a VARCHAR(30) NOT NULL DEFAULT 'VISITA',
    requiere_observacion BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT chk_motivos_cancelacion_aplica_a
        CHECK (aplica_a IN ('VISITA', 'PLAN_CUIDADO', 'PRESTACION', 'GENERAL'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_motivos_cancelacion_codigo
ON motivos_cancelacion(codigo)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_motivos_cancelacion_aplica_a
ON motivos_cancelacion(aplica_a);

CREATE INDEX IF NOT EXISTS idx_motivos_cancelacion_activo
ON motivos_cancelacion(activo);

CREATE INDEX IF NOT EXISTS idx_motivos_cancelacion_deleted_at
ON motivos_cancelacion(deleted_at);

DROP TRIGGER IF EXISTS trg_motivos_cancelacion_updated_at ON motivos_cancelacion;
CREATE TRIGGER trg_motivos_cancelacion_updated_at
BEFORE UPDATE ON motivos_cancelacion
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: motivos_reprogramacion
-- =========================================================

CREATE TABLE IF NOT EXISTS motivos_reprogramacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    requiere_observacion BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_motivos_reprogramacion_codigo
ON motivos_reprogramacion(codigo)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_motivos_reprogramacion_activo
ON motivos_reprogramacion(activo);

CREATE INDEX IF NOT EXISTS idx_motivos_reprogramacion_deleted_at
ON motivos_reprogramacion(deleted_at);

DROP TRIGGER IF EXISTS trg_motivos_reprogramacion_updated_at ON motivos_reprogramacion;
CREATE TRIGGER trg_motivos_reprogramacion_updated_at
BEFORE UPDATE ON motivos_reprogramacion
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: reglas_asignacion
-- Reglas configurables que interpretará el backend.
-- =========================================================

CREATE TABLE IF NOT EXISTS reglas_asignacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    prioridad INTEGER NOT NULL DEFAULT 100,

    condiciones JSONB NOT NULL DEFAULT '{}'::jsonb,
    acciones JSONB NOT NULL DEFAULT '{}'::jsonb,

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT chk_reglas_asignacion_prioridad
        CHECK (prioridad > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reglas_asignacion_codigo
ON reglas_asignacion(codigo)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reglas_asignacion_prioridad
ON reglas_asignacion(prioridad);

CREATE INDEX IF NOT EXISTS idx_reglas_asignacion_activa
ON reglas_asignacion(activa);

CREATE INDEX IF NOT EXISTS idx_reglas_asignacion_deleted_at
ON reglas_asignacion(deleted_at);

DROP TRIGGER IF EXISTS trg_reglas_asignacion_updated_at ON reglas_asignacion;
CREATE TRIGGER trg_reglas_asignacion_updated_at
BEFORE UPDATE ON reglas_asignacion
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: visitas
-- =========================================================

CREATE TABLE IF NOT EXISTS visitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    paciente_id UUID NOT NULL,
    profesional_salud_id UUID NOT NULL,
    zona_id UUID,
    plan_cuidado_id UUID,
    direccion_paciente_id UUID,

    fecha_programada DATE NOT NULL,
    hora_programada TIME NOT NULL,

    duracion_estimada_min INTEGER,

    fecha_hora_inicio_real TIMESTAMP,
    fecha_hora_fin_real TIMESTAMP,

    check_in_at TIMESTAMP,
    check_out_at TIMESTAMP,

    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
    prioridad VARCHAR(20) NOT NULL DEFAULT 'NORMAL',

    creada_por_usuario_id UUID NOT NULL,

    motivo_cancelacion_id UUID,
    cancelada_at TIMESTAMP,
    cancelada_por_usuario_id UUID,
    observacion_cancelacion TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_visitas_pacientes
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_visitas_profesionales_salud
        FOREIGN KEY (profesional_salud_id)
        REFERENCES profesionales_salud(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_visitas_zonas
        FOREIGN KEY (zona_id)
        REFERENCES zonas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_visitas_planes_cuidado
        FOREIGN KEY (plan_cuidado_id)
        REFERENCES planes_cuidado(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_visitas_direccion_paciente
        FOREIGN KEY (direccion_paciente_id)
        REFERENCES direcciones_paciente(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_visitas_usuarios_creador
        FOREIGN KEY (creada_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_visitas_motivo_cancelacion
        FOREIGN KEY (motivo_cancelacion_id)
        REFERENCES motivos_cancelacion(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_visitas_cancelada_por_usuario
        FOREIGN KEY (cancelada_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_visitas_estado
        CHECK (estado IN (
            'PROGRAMADA',
            'EN_CAMINO',
            'EN_ATENCION',
            'REALIZADA',
            'CANCELADA',
            'REPROGRAMADA',
            'NO_REALIZADA'
        )),

    CONSTRAINT chk_visitas_prioridad
        CHECK (prioridad IN ('BAJA', 'NORMAL', 'ALTA', 'URGENTE')),

    CONSTRAINT chk_visitas_duracion_estimada
        CHECK (duracion_estimada_min IS NULL OR duracion_estimada_min > 0)
);

CREATE INDEX IF NOT EXISTS idx_visitas_paciente_id
ON visitas(paciente_id);

CREATE INDEX IF NOT EXISTS idx_visitas_profesional_salud_id
ON visitas(profesional_salud_id);

CREATE INDEX IF NOT EXISTS idx_visitas_zona_id
ON visitas(zona_id);

CREATE INDEX IF NOT EXISTS idx_visitas_plan_cuidado_id
ON visitas(plan_cuidado_id);

CREATE INDEX IF NOT EXISTS idx_visitas_direccion_paciente_id
ON visitas(direccion_paciente_id);

CREATE INDEX IF NOT EXISTS idx_visitas_creada_por_usuario_id
ON visitas(creada_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_visitas_fecha_programada
ON visitas(fecha_programada);

CREATE INDEX IF NOT EXISTS idx_visitas_estado
ON visitas(estado);

CREATE INDEX IF NOT EXISTS idx_visitas_prioridad
ON visitas(prioridad);

CREATE INDEX IF NOT EXISTS idx_visitas_check_in_at
ON visitas(check_in_at);

CREATE INDEX IF NOT EXISTS idx_visitas_check_out_at
ON visitas(check_out_at);

CREATE INDEX IF NOT EXISTS idx_visitas_motivo_cancelacion_id
ON visitas(motivo_cancelacion_id);

CREATE INDEX IF NOT EXISTS idx_visitas_cancelada_at
ON visitas(cancelada_at);

CREATE INDEX IF NOT EXISTS idx_visitas_cancelada_por_usuario_id
ON visitas(cancelada_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_visitas_deleted_at
ON visitas(deleted_at);

DROP TRIGGER IF EXISTS trg_visitas_updated_at ON visitas;
CREATE TRIGGER trg_visitas_updated_at
BEFORE UPDATE ON visitas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: fichas_clinicas
-- Mantiene formulario dinámico en contenido JSONB.
-- Por ahora dejamos 1 ficha clínica activa por visita.
-- =========================================================

CREATE TABLE IF NOT EXISTS fichas_clinicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visita_id UUID NOT NULL,
    plantilla_ficha_id UUID,

    estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
    contenido JSONB NOT NULL DEFAULT '{}'::jsonb,

    creada_por_usuario_id UUID NOT NULL,
    actualizada_por_usuario_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_fichas_clinicas_visitas
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_fichas_clinicas_plantilla_ficha
        FOREIGN KEY (plantilla_ficha_id)
        REFERENCES plantillas_ficha(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_fichas_clinicas_usuario_creador
        FOREIGN KEY (creada_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_fichas_clinicas_usuario_actualizador
        FOREIGN KEY (actualizada_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_fichas_clinicas_estado
        CHECK (estado IN ('BORRADOR', 'CERRADA', 'ANULADA'))
);

ALTER TABLE fichas_clinicas
ADD COLUMN IF NOT EXISTS plantilla_ficha_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fichas_clinicas_visita_id
ON fichas_clinicas(visita_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fichas_clinicas_visita_id
ON fichas_clinicas(visita_id);

CREATE INDEX IF NOT EXISTS idx_fichas_clinicas_plantilla_ficha_id
ON fichas_clinicas(plantilla_ficha_id);

CREATE INDEX IF NOT EXISTS idx_fichas_clinicas_creada_por_usuario_id
ON fichas_clinicas(creada_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_fichas_clinicas_actualizada_por_usuario_id
ON fichas_clinicas(actualizada_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_fichas_clinicas_deleted_at
ON fichas_clinicas(deleted_at);

DROP TRIGGER IF EXISTS trg_fichas_clinicas_updated_at ON fichas_clinicas;
CREATE TRIGGER trg_fichas_clinicas_updated_at
BEFORE UPDATE ON fichas_clinicas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_fichas_clinicas_plantilla_ficha'
    ) THEN
        ALTER TABLE fichas_clinicas
        ADD CONSTRAINT fk_fichas_clinicas_plantilla_ficha
        FOREIGN KEY (plantilla_ficha_id)
        REFERENCES plantillas_ficha(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
END;
$$;

-- =========================================================
-- TABLA: plantilla_ficha_campos
-- Campos configurables que componen una plantilla clínica.
-- =========================================================

CREATE TABLE IF NOT EXISTS plantilla_ficha_campos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    plantilla_ficha_id UUID NOT NULL,
    variable_clinica_id UUID,

    codigo_campo VARCHAR(100) NOT NULL,
    etiqueta VARCHAR(150) NOT NULL,
    tipo_campo VARCHAR(30) NOT NULL,

    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    orden INTEGER NOT NULL DEFAULT 0,
    ayuda_texto TEXT,
    opciones JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_plantilla_ficha_campos_plantilla
        FOREIGN KEY (plantilla_ficha_id)
        REFERENCES plantillas_ficha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_plantilla_ficha_campos_variable
        FOREIGN KEY (variable_clinica_id)
        REFERENCES variables_clinicas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_plantilla_ficha_campos_orden
        CHECK (orden >= 0),

    CONSTRAINT chk_plantilla_ficha_campos_tipo
        CHECK (tipo_campo IN (
            'VARIABLE_CLINICA',
            'TEXTO_LIBRE',
            'NUMERO_LIBRE',
            'BOOLEANO',
            'FECHA',
            'SELECT',
            'MULTISELECT',
            'JSON',
            'ARCHIVO',
            'IMAGEN'
        )),

    CONSTRAINT chk_plantilla_ficha_campos_variable_requerida
        CHECK (
            tipo_campo <> 'VARIABLE_CLINICA'
            OR variable_clinica_id IS NOT NULL
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plantilla_ficha_campos_codigo
ON plantilla_ficha_campos(plantilla_ficha_id, codigo_campo)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_plantilla_ficha_campos_plantilla_id
ON plantilla_ficha_campos(plantilla_ficha_id);

CREATE INDEX IF NOT EXISTS idx_plantilla_ficha_campos_variable_id
ON plantilla_ficha_campos(variable_clinica_id);

CREATE INDEX IF NOT EXISTS idx_plantilla_ficha_campos_orden
ON plantilla_ficha_campos(orden);

CREATE INDEX IF NOT EXISTS idx_plantilla_ficha_campos_deleted_at
ON plantilla_ficha_campos(deleted_at);

DROP TRIGGER IF EXISTS trg_plantilla_ficha_campos_updated_at ON plantilla_ficha_campos;
CREATE TRIGGER trg_plantilla_ficha_campos_updated_at
BEFORE UPDATE ON plantilla_ficha_campos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: mediciones_clinicas
-- Datos clínicos importantes normalizados desde ficha u otros orígenes.
-- =========================================================

CREATE TABLE IF NOT EXISTS mediciones_clinicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ficha_clinica_id UUID,
    visita_id UUID,
    paciente_id UUID NOT NULL,
    variable_clinica_id UUID NOT NULL,

    valor_numero NUMERIC(12,4),
    valor_texto TEXT,
    valor_boolean BOOLEAN,
    valor_fecha DATE,
    valor_json JSONB,

    unidad VARCHAR(30),
    origen VARCHAR(30) NOT NULL DEFAULT 'FICHA',
    registrado_por_usuario_id UUID,
    fecha_medicion TIMESTAMP NOT NULL DEFAULT NOW(),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_mediciones_clinicas_ficha
        FOREIGN KEY (ficha_clinica_id)
        REFERENCES fichas_clinicas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_mediciones_clinicas_visita
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_mediciones_clinicas_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_mediciones_clinicas_variable
        FOREIGN KEY (variable_clinica_id)
        REFERENCES variables_clinicas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_mediciones_clinicas_usuario_registro
        FOREIGN KEY (registrado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_mediciones_clinicas_origen
        CHECK (origen IN ('FICHA', 'SENSOR', 'MANUAL', 'IMPORTACION')),

    CONSTRAINT chk_mediciones_clinicas_valor_requerido
        CHECK (
            valor_numero IS NOT NULL
            OR valor_texto IS NOT NULL
            OR valor_boolean IS NOT NULL
            OR valor_fecha IS NOT NULL
            OR valor_json IS NOT NULL
        )
);

CREATE INDEX IF NOT EXISTS idx_mediciones_clinicas_ficha_id
ON mediciones_clinicas(ficha_clinica_id);

CREATE INDEX IF NOT EXISTS idx_mediciones_clinicas_visita_id
ON mediciones_clinicas(visita_id);

CREATE INDEX IF NOT EXISTS idx_mediciones_clinicas_paciente_id
ON mediciones_clinicas(paciente_id);

CREATE INDEX IF NOT EXISTS idx_mediciones_clinicas_variable_id
ON mediciones_clinicas(variable_clinica_id);

CREATE INDEX IF NOT EXISTS idx_mediciones_clinicas_fecha_medicion
ON mediciones_clinicas(fecha_medicion);

CREATE INDEX IF NOT EXISTS idx_mediciones_clinicas_origen
ON mediciones_clinicas(origen);

CREATE INDEX IF NOT EXISTS idx_mediciones_clinicas_deleted_at
ON mediciones_clinicas(deleted_at);

DROP TRIGGER IF EXISTS trg_mediciones_clinicas_updated_at ON mediciones_clinicas;
CREATE TRIGGER trg_mediciones_clinicas_updated_at
BEFORE UPDATE ON mediciones_clinicas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: documentos_adjuntos
-- Incluye versionado y metadata completa.
-- =========================================================

CREATE TABLE IF NOT EXISTS documentos_adjuntos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ficha_clinica_id UUID NOT NULL,

    nombre_archivo VARCHAR(150) NOT NULL,
    tipo_archivo VARCHAR(50),
    mime_type VARCHAR(120),
    tamano_bytes BIGINT,
    hash_archivo VARCHAR(128),

    url TEXT NOT NULL,
    descripcion TEXT,

    version INTEGER NOT NULL DEFAULT 1,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    categoria VARCHAR(50) DEFAULT 'GENERAL',

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    subido_por_usuario_id UUID,
    documento_padre_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_documentos_adjuntos_fichas_clinicas
        FOREIGN KEY (ficha_clinica_id)
        REFERENCES fichas_clinicas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_documentos_adjuntos_subido_por_usuario
        FOREIGN KEY (subido_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_documentos_adjuntos_documento_padre
        FOREIGN KEY (documento_padre_id)
        REFERENCES documentos_adjuntos(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_documentos_adjuntos_version
        CHECK (version > 0),

    CONSTRAINT chk_documentos_adjuntos_tamano
        CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0),

    CONSTRAINT chk_documentos_adjuntos_estado
        CHECK (estado IN ('ACTIVO', 'REEMPLAZADO', 'ANULADO', 'ELIMINADO')),

    CONSTRAINT chk_documentos_adjuntos_categoria
        CHECK (categoria IN ('GENERAL', 'FOTO_CLINICA', 'CONSENTIMIENTO', 'INDICACION', 'EXAMEN', 'OTRO'))
);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_ficha_clinica_id
ON documentos_adjuntos(ficha_clinica_id);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_mime_type
ON documentos_adjuntos(mime_type);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_hash_archivo
ON documentos_adjuntos(hash_archivo);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_estado
ON documentos_adjuntos(estado);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_categoria
ON documentos_adjuntos(categoria);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_subido_por_usuario_id
ON documentos_adjuntos(subido_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_documento_padre_id
ON documentos_adjuntos(documento_padre_id);

CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_deleted_at
ON documentos_adjuntos(deleted_at);

DROP TRIGGER IF EXISTS trg_documentos_adjuntos_updated_at ON documentos_adjuntos;
CREATE TRIGGER trg_documentos_adjuntos_updated_at
BEFORE UPDATE ON documentos_adjuntos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: alertas
-- =========================================================

CREATE TABLE IF NOT EXISTS alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    paciente_id UUID NOT NULL,
    visita_id UUID NOT NULL,

    tipo VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_alertas_pacientes
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_alertas_visitas
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_alertas_prioridad
        CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),

    CONSTRAINT chk_alertas_estado
        CHECK (estado IN ('ABIERTA', 'EN_REVISION', 'RESUELTA', 'CERRADA', 'CANCELADA'))
);

CREATE INDEX IF NOT EXISTS idx_alertas_paciente_id
ON alertas(paciente_id);

CREATE INDEX IF NOT EXISTS idx_alertas_visita_id
ON alertas(visita_id);

CREATE INDEX IF NOT EXISTS idx_alertas_estado
ON alertas(estado);

CREATE INDEX IF NOT EXISTS idx_alertas_prioridad
ON alertas(prioridad);

CREATE INDEX IF NOT EXISTS idx_alertas_deleted_at
ON alertas(deleted_at);

DROP TRIGGER IF EXISTS trg_alertas_updated_at ON alertas;
CREATE TRIGGER trg_alertas_updated_at
BEFORE UPDATE ON alertas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: auditorias
-- =========================================================

CREATE TABLE IF NOT EXISTS auditorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    usuario_id UUID NOT NULL,

    entidad VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT,

    old_values JSONB,
    new_values JSONB,

    ip_address VARCHAR(50),
    user_agent TEXT,
    request_id VARCHAR(100),
    endpoint TEXT,
    metodo_http VARCHAR(10),
    origen VARCHAR(30) DEFAULT 'WEB',

    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_auditorias_usuarios
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_auditorias_usuario_id
ON auditorias(usuario_id);

CREATE INDEX IF NOT EXISTS idx_auditorias_entidad
ON auditorias(entidad, entidad_id);

CREATE INDEX IF NOT EXISTS idx_auditorias_fecha_hora
ON auditorias(fecha_hora);

CREATE INDEX IF NOT EXISTS idx_auditorias_request_id
ON auditorias(request_id);

CREATE INDEX IF NOT EXISTS idx_auditorias_origen
ON auditorias(origen);

CREATE INDEX IF NOT EXISTS idx_auditorias_accion
ON auditorias(accion);

-- =========================================================
-- P0: historial de estados de visitas
-- =========================================================

CREATE TABLE IF NOT EXISTS visita_estado_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visita_id UUID NOT NULL,

    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,

    motivo TEXT,
    observacion TEXT,

    cambiado_por_usuario_id UUID NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_visita_estado_historial_visitas
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_visita_estado_historial_usuarios
        FOREIGN KEY (cambiado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_visita_estado_historial_estado_nuevo
        CHECK (estado_nuevo IN (
            'PROGRAMADA',
            'EN_CAMINO',
            'EN_ATENCION',
            'REALIZADA',
            'CANCELADA',
            'REPROGRAMADA',
            'NO_REALIZADA'
        ))
);

CREATE INDEX IF NOT EXISTS idx_visita_estado_historial_visita_id
ON visita_estado_historial(visita_id);

CREATE INDEX IF NOT EXISTS idx_visita_estado_historial_estado_nuevo
ON visita_estado_historial(estado_nuevo);

CREATE INDEX IF NOT EXISTS idx_visita_estado_historial_created_at
ON visita_estado_historial(created_at);

CREATE INDEX IF NOT EXISTS idx_visita_estado_historial_usuario_id
ON visita_estado_historial(cambiado_por_usuario_id);

-- =========================================================
-- P0: check-in / check-out
-- =========================================================

CREATE TABLE IF NOT EXISTS visita_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visita_id UUID NOT NULL,

    tipo VARCHAR(20) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),

    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    precision_metros NUMERIC(10, 2),

    origen VARCHAR(30) NOT NULL DEFAULT 'APP',
    observacion TEXT,

    registrado_por_usuario_id UUID NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_visita_checkpoints_visitas
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_visita_checkpoints_usuarios
        FOREIGN KEY (registrado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_visita_checkpoints_tipo
        CHECK (tipo IN ('CHECK_IN', 'CHECK_OUT')),

    CONSTRAINT chk_visita_checkpoints_origen
        CHECK (origen IN ('APP', 'WEB', 'OFFLINE_SYNC', 'ADMIN')),

    CONSTRAINT chk_visita_checkpoints_latitud
        CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),

    CONSTRAINT chk_visita_checkpoints_longitud
        CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visita_checkpoints_visita_tipo
ON visita_checkpoints(visita_id, tipo);

CREATE INDEX IF NOT EXISTS idx_visita_checkpoints_visita_id
ON visita_checkpoints(visita_id);

CREATE INDEX IF NOT EXISTS idx_visita_checkpoints_tipo
ON visita_checkpoints(tipo);

CREATE INDEX IF NOT EXISTS idx_visita_checkpoints_fecha_hora
ON visita_checkpoints(fecha_hora);

CREATE INDEX IF NOT EXISTS idx_visita_checkpoints_usuario_id
ON visita_checkpoints(registrado_por_usuario_id);

-- =========================================================
-- P0: visita_prestaciones
-- =========================================================

CREATE TABLE IF NOT EXISTS visita_prestaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visita_id UUID NOT NULL,
    prestacion_id UUID NOT NULL,

    cantidad INTEGER NOT NULL DEFAULT 1,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
    observacion TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_visita_prestaciones_visitas
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_visita_prestaciones_prestaciones
        FOREIGN KEY (prestacion_id)
        REFERENCES prestaciones(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_visita_prestaciones_estado
        CHECK (estado IN ('PROGRAMADA', 'REALIZADA', 'NO_REALIZADA', 'CANCELADA')),

    CONSTRAINT chk_visita_prestaciones_cantidad
        CHECK (cantidad > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visita_prestaciones_visita_prestacion
ON visita_prestaciones(visita_id, prestacion_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_visita_prestaciones_visita_id
ON visita_prestaciones(visita_id);

CREATE INDEX IF NOT EXISTS idx_visita_prestaciones_prestacion_id
ON visita_prestaciones(prestacion_id);

CREATE INDEX IF NOT EXISTS idx_visita_prestaciones_estado
ON visita_prestaciones(estado);

CREATE INDEX IF NOT EXISTS idx_visita_prestaciones_deleted_at
ON visita_prestaciones(deleted_at);

DROP TRIGGER IF EXISTS trg_visita_prestaciones_updated_at ON visita_prestaciones;
CREATE TRIGGER trg_visita_prestaciones_updated_at
BEFORE UPDATE ON visita_prestaciones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- P0: contactos_paciente
-- =========================================================

CREATE TABLE IF NOT EXISTS contactos_paciente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    paciente_id UUID NOT NULL,

    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100),
    parentesco VARCHAR(50),

    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    direccion TEXT,

    es_contacto_emergencia BOOLEAN NOT NULL DEFAULT FALSE,
    es_cuidador_principal BOOLEAN NOT NULL DEFAULT FALSE,

    puede_recibir_info_clinica BOOLEAN NOT NULL DEFAULT FALSE,
    puede_recibir_notificaciones BOOLEAN NOT NULL DEFAULT TRUE,

    observacion TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_contactos_paciente_pacientes
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contactos_paciente_paciente_id
ON contactos_paciente(paciente_id);

CREATE INDEX IF NOT EXISTS idx_contactos_paciente_emergencia
ON contactos_paciente(es_contacto_emergencia);

CREATE INDEX IF NOT EXISTS idx_contactos_paciente_cuidador
ON contactos_paciente(es_cuidador_principal);

CREATE INDEX IF NOT EXISTS idx_contactos_paciente_notificaciones
ON contactos_paciente(puede_recibir_notificaciones);

CREATE INDEX IF NOT EXISTS idx_contactos_paciente_deleted_at
ON contactos_paciente(deleted_at);

DROP TRIGGER IF EXISTS trg_contactos_paciente_updated_at ON contactos_paciente;
CREATE TRIGGER trg_contactos_paciente_updated_at
BEFORE UPDATE ON contactos_paciente
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- P1: disponibilidad de profesionales
-- =========================================================

CREATE TABLE IF NOT EXISTS disponibilidades_profesionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    profesional_salud_id UUID NOT NULL,
    zona_id UUID,

    dia_semana INTEGER NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,

    capacidad_max_visitas INTEGER,

    vigente_desde DATE,
    vigente_hasta DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_disponibilidades_profesionales_profesional
        FOREIGN KEY (profesional_salud_id)
        REFERENCES profesionales_salud(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_disponibilidades_profesionales_zonas
        FOREIGN KEY (zona_id)
        REFERENCES zonas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_disponibilidades_dia_semana
        CHECK (dia_semana BETWEEN 1 AND 7),

    CONSTRAINT chk_disponibilidades_horario
        CHECK (hora_inicio < hora_fin),

    CONSTRAINT chk_disponibilidades_capacidad
        CHECK (capacidad_max_visitas IS NULL OR capacidad_max_visitas > 0),

    CONSTRAINT chk_disponibilidades_vigencia
        CHECK (
            vigente_desde IS NULL
            OR vigente_hasta IS NULL
            OR vigente_desde <= vigente_hasta
        )
);

CREATE INDEX IF NOT EXISTS idx_disponibilidades_profesional_id
ON disponibilidades_profesionales(profesional_salud_id);

CREATE INDEX IF NOT EXISTS idx_disponibilidades_zona_id
ON disponibilidades_profesionales(zona_id);

CREATE INDEX IF NOT EXISTS idx_disponibilidades_dia_semana
ON disponibilidades_profesionales(dia_semana);

CREATE INDEX IF NOT EXISTS idx_disponibilidades_activo
ON disponibilidades_profesionales(activo);

CREATE INDEX IF NOT EXISTS idx_disponibilidades_deleted_at
ON disponibilidades_profesionales(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_disponibilidades_profesional_bloque
ON disponibilidades_profesionales(
    profesional_salud_id,
    dia_semana,
    hora_inicio,
    hora_fin,
    COALESCE(zona_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_disponibilidades_profesionales_updated_at ON disponibilidades_profesionales;
CREATE TRIGGER trg_disponibilidades_profesionales_updated_at
BEFORE UPDATE ON disponibilidades_profesionales
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- P1: reprogramaciones_visita
-- =========================================================

CREATE TABLE IF NOT EXISTS reprogramaciones_visita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    visita_id UUID NOT NULL,

    fecha_programada_anterior DATE NOT NULL,
    hora_programada_anterior TIME NOT NULL,

    fecha_programada_nueva DATE NOT NULL,
    hora_programada_nueva TIME NOT NULL,

    motivo_reprogramacion_id UUID,
    observacion TEXT,

    reprogramada_por_usuario_id UUID NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_reprogramaciones_visita_visitas
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_reprogramaciones_visita_motivo
        FOREIGN KEY (motivo_reprogramacion_id)
        REFERENCES motivos_reprogramacion(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_reprogramaciones_visita_usuario
        FOREIGN KEY (reprogramada_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_visita_visita_id
ON reprogramaciones_visita(visita_id);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_visita_motivo_id
ON reprogramaciones_visita(motivo_reprogramacion_id);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_visita_usuario_id
ON reprogramaciones_visita(reprogramada_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_reprogramaciones_visita_created_at
ON reprogramaciones_visita(created_at);

-- =========================================================
-- P1: bloqueos_agenda
-- =========================================================

CREATE TABLE IF NOT EXISTS bloqueos_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tipo VARCHAR(30) NOT NULL,

    profesional_salud_id UUID,
    zona_id UUID,

    fecha_hora_inicio TIMESTAMP NOT NULL,
    fecha_hora_fin TIMESTAMP NOT NULL,

    motivo VARCHAR(150) NOT NULL,
    observacion TEXT,

    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',

    creado_por_usuario_id UUID NOT NULL,
    cancelado_por_usuario_id UUID,
    cancelado_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_bloqueos_agenda_profesional
        FOREIGN KEY (profesional_salud_id)
        REFERENCES profesionales_salud(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_bloqueos_agenda_zona
        FOREIGN KEY (zona_id)
        REFERENCES zonas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_bloqueos_agenda_usuario_creador
        FOREIGN KEY (creado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_bloqueos_agenda_usuario_cancelador
        FOREIGN KEY (cancelado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_bloqueos_agenda_tipo
        CHECK (tipo IN ('GENERAL', 'PROFESIONAL', 'ZONA')),

    CONSTRAINT chk_bloqueos_agenda_horario
        CHECK (fecha_hora_inicio < fecha_hora_fin),

    CONSTRAINT chk_bloqueos_agenda_estado
        CHECK (estado IN ('ACTIVO', 'CANCELADO')),

    CONSTRAINT chk_bloqueos_agenda_tipo_relacion
        CHECK (
            tipo = 'GENERAL'
            OR (tipo = 'PROFESIONAL' AND profesional_salud_id IS NOT NULL)
            OR (tipo = 'ZONA' AND zona_id IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_bloqueos_agenda_tipo
ON bloqueos_agenda(tipo);

CREATE INDEX IF NOT EXISTS idx_bloqueos_agenda_profesional_id
ON bloqueos_agenda(profesional_salud_id);

CREATE INDEX IF NOT EXISTS idx_bloqueos_agenda_zona_id
ON bloqueos_agenda(zona_id);

CREATE INDEX IF NOT EXISTS idx_bloqueos_agenda_rango
ON bloqueos_agenda(fecha_hora_inicio, fecha_hora_fin);

CREATE INDEX IF NOT EXISTS idx_bloqueos_agenda_estado
ON bloqueos_agenda(estado);

CREATE INDEX IF NOT EXISTS idx_bloqueos_agenda_deleted_at
ON bloqueos_agenda(deleted_at);

DROP TRIGGER IF EXISTS trg_bloqueos_agenda_updated_at ON bloqueos_agenda;
CREATE TRIGGER trg_bloqueos_agenda_updated_at
BEFORE UPDATE ON bloqueos_agenda
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- P1: incidentes_salud
-- =========================================================

CREATE TABLE IF NOT EXISTS incidentes_salud (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tipo VARCHAR(80) NOT NULL,
    severidad VARCHAR(30) NOT NULL DEFAULT 'MEDIA',
    estado VARCHAR(30) NOT NULL DEFAULT 'ABIERTO',

    titulo VARCHAR(180) NOT NULL,
    descripcion TEXT,

    paciente_id UUID,
    visita_id UUID,
    alerta_id UUID,
    profesional_salud_id UUID,

    responsable_usuario_id UUID,

    origen VARCHAR(30) NOT NULL DEFAULT 'SISTEMA',

    external_incident_id VARCHAR(150),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    creado_por_usuario_id UUID,
    resuelto_por_usuario_id UUID,

    resuelto_at TIMESTAMP,
    cerrado_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT fk_incidentes_salud_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidentes_salud_visita
        FOREIGN KEY (visita_id)
        REFERENCES visitas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidentes_salud_alerta
        FOREIGN KEY (alerta_id)
        REFERENCES alertas(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidentes_salud_profesional
        FOREIGN KEY (profesional_salud_id)
        REFERENCES profesionales_salud(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidentes_salud_responsable
        FOREIGN KEY (responsable_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidentes_salud_creador
        FOREIGN KEY (creado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_incidentes_salud_resuelto_por
        FOREIGN KEY (resuelto_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_incidentes_salud_severidad
        CHECK (severidad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),

    CONSTRAINT chk_incidentes_salud_estado
        CHECK (estado IN ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'CERRADO', 'CANCELADO')),

    CONSTRAINT chk_incidentes_salud_origen
        CHECK (origen IN ('WEB', 'APP', 'SISTEMA', 'INTEGRACION'))
);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_tipo
ON incidentes_salud(tipo);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_severidad
ON incidentes_salud(severidad);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_estado
ON incidentes_salud(estado);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_paciente_id
ON incidentes_salud(paciente_id);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_visita_id
ON incidentes_salud(visita_id);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_alerta_id
ON incidentes_salud(alerta_id);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_profesional_id
ON incidentes_salud(profesional_salud_id);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_responsable_id
ON incidentes_salud(responsable_usuario_id);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_external_id
ON incidentes_salud(external_incident_id);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_created_at
ON incidentes_salud(created_at);

CREATE INDEX IF NOT EXISTS idx_incidentes_salud_deleted_at
ON incidentes_salud(deleted_at);

DROP TRIGGER IF EXISTS trg_incidentes_salud_updated_at ON incidentes_salud;
CREATE TRIGGER trg_incidentes_salud_updated_at
BEFORE UPDATE ON incidentes_salud
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- P1: incidente_estado_historial
-- =========================================================

CREATE TABLE IF NOT EXISTS incidente_estado_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incidente_salud_id UUID NOT NULL,

    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,

    motivo TEXT,
    observacion TEXT,

    cambiado_por_usuario_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_incidente_estado_historial_incidente
        FOREIGN KEY (incidente_salud_id)
        REFERENCES incidentes_salud(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_incidente_estado_historial_usuario
        FOREIGN KEY (cambiado_por_usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_incidente_estado_historial_estado_nuevo
        CHECK (estado_nuevo IN ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'CERRADO', 'CANCELADO'))
);

CREATE INDEX IF NOT EXISTS idx_incidente_estado_historial_incidente_id
ON incidente_estado_historial(incidente_salud_id);

CREATE INDEX IF NOT EXISTS idx_incidente_estado_historial_estado_nuevo
ON incidente_estado_historial(estado_nuevo);

CREATE INDEX IF NOT EXISTS idx_incidente_estado_historial_created_at
ON incidente_estado_historial(created_at);

-- =========================================================
-- DASHBOARDS INTERNOS COMO VISTAS
-- =========================================================

CREATE OR REPLACE VIEW vw_dashboard_resumen_operativo AS
SELECT
    CURRENT_DATE AS fecha_referencia,

    COUNT(*) FILTER (
        WHERE v.fecha_programada = CURRENT_DATE
          AND v.deleted_at IS NULL
    ) AS visitas_programadas_hoy,

    COUNT(*) FILTER (
        WHERE v.fecha_programada = CURRENT_DATE
          AND v.estado = 'REALIZADA'
          AND v.deleted_at IS NULL
    ) AS visitas_realizadas_hoy,

    COUNT(*) FILTER (
        WHERE v.fecha_programada = CURRENT_DATE
          AND v.estado = 'CANCELADA'
          AND v.deleted_at IS NULL
    ) AS visitas_canceladas_hoy,

    COUNT(*) FILTER (
        WHERE v.fecha_programada < CURRENT_DATE
          AND v.estado NOT IN ('REALIZADA', 'CANCELADA')
          AND v.deleted_at IS NULL
    ) AS visitas_atrasadas,

    (
        SELECT COUNT(*)
        FROM pacientes p
        WHERE p.deleted_at IS NULL
    ) AS pacientes_activos,

    (
        SELECT COUNT(*)
        FROM planes_cuidado pc
        WHERE pc.estado = 'ACTIVO'
          AND pc.deleted_at IS NULL
    ) AS planes_cuidado_activos,

    (
        SELECT COUNT(*)
        FROM incidentes_salud i
        WHERE i.estado IN ('ABIERTO', 'EN_REVISION')
          AND i.deleted_at IS NULL
    ) AS incidentes_abiertos

FROM visitas v;

CREATE OR REPLACE VIEW vw_dashboard_visitas_por_estado AS
SELECT
    v.estado,
    COUNT(*) AS total
FROM visitas v
WHERE v.deleted_at IS NULL
GROUP BY v.estado;

CREATE OR REPLACE VIEW vw_dashboard_visitas_por_prioridad AS
SELECT
    v.prioridad,
    COUNT(*) AS total
FROM visitas v
WHERE v.deleted_at IS NULL
GROUP BY v.prioridad;

CREATE OR REPLACE VIEW vw_dashboard_carga_profesionales AS
SELECT
    ps.id AS profesional_salud_id,
    u.nombres,
    u.apellidos,
    ps.profesion,

    COUNT(v.id) FILTER (
        WHERE v.deleted_at IS NULL
    ) AS total_visitas_asignadas,

    COUNT(v.id) FILTER (
        WHERE v.fecha_programada = CURRENT_DATE
          AND v.deleted_at IS NULL
    ) AS visitas_hoy,

    COUNT(v.id) FILTER (
        WHERE v.estado = 'REALIZADA'
          AND v.deleted_at IS NULL
    ) AS visitas_realizadas,

    COUNT(v.id) FILTER (
        WHERE v.estado = 'CANCELADA'
          AND v.deleted_at IS NULL
    ) AS visitas_canceladas

FROM profesionales_salud ps
JOIN usuarios u
    ON u.id = ps.usuario_id
LEFT JOIN visitas v
    ON v.profesional_salud_id = ps.id
WHERE ps.deleted_at IS NULL
  AND u.deleted_at IS NULL
GROUP BY ps.id, u.nombres, u.apellidos, ps.profesion;

CREATE OR REPLACE VIEW vw_dashboard_prestaciones_frecuentes AS
SELECT
    p.id AS prestacion_id,
    p.codigo,
    p.nombre,
    COUNT(vp.id) AS total_asignaciones,
    COUNT(vp.id) FILTER (
        WHERE vp.estado = 'REALIZADA'
    ) AS total_realizadas,
    COUNT(vp.id) FILTER (
        WHERE vp.estado = 'NO_REALIZADA'
    ) AS total_no_realizadas
FROM prestaciones p
LEFT JOIN visita_prestaciones vp
    ON vp.prestacion_id = p.id
   AND vp.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.codigo, p.nombre;

CREATE OR REPLACE VIEW vw_dashboard_incidentes_abiertos AS
SELECT
    i.id,
    i.tipo,
    i.severidad,
    i.estado,
    i.titulo,
    i.paciente_id,
    i.visita_id,
    i.profesional_salud_id,
    i.created_at
FROM incidentes_salud i
WHERE i.estado IN ('ABIERTO', 'EN_REVISION')
  AND i.deleted_at IS NULL;

-- =========================================================
-- SEEDS BÁSICOS
-- =========================================================

INSERT INTO roles (nombre, descripcion)
VALUES
('COORDINADOR', 'Usuario encargado de coordinar visitas domiciliarias.'),
('PROFESIONAL', 'Profesional de salud que realiza atenciones en terreno.'),
('SUPERVISOR', 'Usuario encargado de supervisar operación y seguimiento.'),
('ADMIN', 'Usuario administrador del sistema.')
ON CONFLICT DO NOTHING;

INSERT INTO usuarios (
    identity_user_id,
    rol_id,
    rut,
    nombres,
    apellidos,
    email,
    telefono,
    activo
)
VALUES (
    '44f7c9d4-f7c0-41e9-8265-89418d3709af',
    (SELECT id FROM roles WHERE nombre = 'PROFESIONAL' LIMIT 1),
    '33333333-3',
    'Usuario',
    'Test',
    'test@ucn.cl',
    '+56933333333',
    TRUE
)
ON CONFLICT (identity_user_id) DO NOTHING;

INSERT INTO profesionales_salud (
    usuario_id,
    profesion,
    numero_registro,
    activo
)
VALUES (
    (
        SELECT id
        FROM usuarios
        WHERE identity_user_id = '44f7c9d4-f7c0-41e9-8265-89418d3709af'
        LIMIT 1
    ),
    'ENFERMERIA',
    'REG-TEST-001',
    TRUE
)
ON CONFLICT (usuario_id) DO NOTHING;

INSERT INTO prestaciones (codigo, nombre, descripcion, duracion_estimada_min)
VALUES
('CONTROL_SIGNOS_VITALES', 'Control de signos vitales', 'Registro básico de signos vitales del paciente.', 20),
('CURACION_DOMICILIARIA', 'Curación domiciliaria', 'Atención de curación en domicilio.', 40),
('EVALUACION_MEDICA', 'Evaluación médica domiciliaria', 'Evaluación médica general en domicilio.', 45),
('KINESIOTERAPIA', 'Kinesioterapia domiciliaria', 'Sesión de kinesioterapia en domicilio.', 45),
('ADMINISTRACION_MEDICAMENTO', 'Administración de medicamento', 'Administración de medicamento indicada para el paciente.', 25),
('EDUCACION_CUIDADOR', 'Educación al cuidador', 'Educación al cuidador o familiar responsable.', 30)
ON CONFLICT DO NOTHING;

INSERT INTO variables_clinicas (
    codigo,
    nombre,
    descripcion,
    categoria,
    tipo_dato,
    unidad,
    valor_minimo,
    valor_maximo,
    sinonimos
)
VALUES
(
    'presion_arterial_sistolica',
    'Presión arterial sistólica',
    'Valor sistólico de presión arterial.',
    'SIGNOS_VITALES',
    'NUMERO',
    'mmHg',
    60,
    250,
    ARRAY['PAS', 'sistolica', 'presion sistolica', 'pa sistolica']
),
(
    'presion_arterial_diastolica',
    'Presión arterial diastólica',
    'Valor diastólico de presión arterial.',
    'SIGNOS_VITALES',
    'NUMERO',
    'mmHg',
    30,
    150,
    ARRAY['PAD', 'diastolica', 'presion diastolica', 'pa diastolica']
),
(
    'frecuencia_cardiaca',
    'Frecuencia cardíaca',
    'Frecuencia cardíaca medida en latidos por minuto.',
    'SIGNOS_VITALES',
    'NUMERO',
    'lpm',
    30,
    220,
    ARRAY['FC', 'pulso', 'frecuencia cardiaca']
),
(
    'frecuencia_respiratoria',
    'Frecuencia respiratoria',
    'Frecuencia respiratoria medida en respiraciones por minuto.',
    'SIGNOS_VITALES',
    'NUMERO',
    'rpm',
    5,
    60,
    ARRAY['FR', 'respiraciones', 'frecuencia respiratoria']
),
(
    'temperatura',
    'Temperatura corporal',
    'Temperatura corporal del paciente.',
    'SIGNOS_VITALES',
    'NUMERO',
    '°C',
    30,
    45,
    ARRAY['temp', 'temperatura axilar', 'temperatura corporal']
),
(
    'saturacion_oxigeno',
    'Saturación de oxígeno',
    'Saturación de oxígeno periférica.',
    'SIGNOS_VITALES',
    'NUMERO',
    '%',
    50,
    100,
    ARRAY['SatO2', 'SpO2', 'saturacion', 'oxigenacion']
),
(
    'glicemia_capilar',
    'Glicemia capilar',
    'Nivel de glicemia capilar.',
    'METABOLICO',
    'NUMERO',
    'mg/dL',
    20,
    600,
    ARRAY['glucosa', 'glicemia', 'hemoglucotest', 'hgt', 'glicemia capilar']
),
(
    'peso',
    'Peso',
    'Peso corporal del paciente.',
    'ANTROPOMETRIA',
    'NUMERO',
    'kg',
    1,
    300,
    ARRAY['peso corporal', 'kg']
),
(
    'talla',
    'Talla',
    'Estatura del paciente.',
    'ANTROPOMETRIA',
    'NUMERO',
    'cm',
    30,
    250,
    ARRAY['estatura', 'altura']
),
(
    'dolor_eva',
    'Dolor escala EVA',
    'Evaluación del dolor en escala visual análoga de 0 a 10.',
    'EVALUACION',
    'NUMERO',
    '0-10',
    0,
    10,
    ARRAY['dolor', 'eva', 'escala dolor']
)
ON CONFLICT DO NOTHING;

INSERT INTO plantillas_ficha (
    codigo,
    nombre,
    descripcion,
    tipo_atencion
)
VALUES
(
    'CONTROL_DOMICILIARIO_GENERAL',
    'Control domiciliario general',
    'Plantilla base para control general de paciente en domicilio.',
    'CONTROL_GENERAL'
)
ON CONFLICT DO NOTHING;

WITH plantilla AS (
    SELECT id
    FROM plantillas_ficha
    WHERE codigo = 'CONTROL_DOMICILIARIO_GENERAL'
),
campos AS (
    SELECT *
    FROM (VALUES
        ('motivo_atencion', 'Motivo de atención', 'TEXTO_LIBRE', NULL, TRUE, 1, 'Motivo principal de la atención domiciliaria.'),
        ('presion_arterial_sistolica', 'Presión arterial sistólica', 'VARIABLE_CLINICA', 'presion_arterial_sistolica', FALSE, 2, NULL),
        ('presion_arterial_diastolica', 'Presión arterial diastólica', 'VARIABLE_CLINICA', 'presion_arterial_diastolica', FALSE, 3, NULL),
        ('frecuencia_cardiaca', 'Frecuencia cardíaca', 'VARIABLE_CLINICA', 'frecuencia_cardiaca', FALSE, 4, NULL),
        ('temperatura', 'Temperatura corporal', 'VARIABLE_CLINICA', 'temperatura', FALSE, 5, NULL),
        ('saturacion_oxigeno', 'Saturación de oxígeno', 'VARIABLE_CLINICA', 'saturacion_oxigeno', FALSE, 6, NULL),
        ('glicemia_capilar', 'Glicemia capilar', 'VARIABLE_CLINICA', 'glicemia_capilar', FALSE, 7, NULL),
        ('observaciones_generales', 'Observaciones generales', 'TEXTO_LIBRE', NULL, FALSE, 8, 'Observaciones clínicas generales de la visita.')
    ) AS c(codigo_campo, etiqueta, tipo_campo, variable_codigo, obligatorio, orden, ayuda_texto)
)
INSERT INTO plantilla_ficha_campos (
    plantilla_ficha_id,
    variable_clinica_id,
    codigo_campo,
    etiqueta,
    tipo_campo,
    obligatorio,
    orden,
    ayuda_texto
)
SELECT
    plantilla.id,
    vc.id,
    campos.codigo_campo,
    campos.etiqueta,
    campos.tipo_campo,
    campos.obligatorio,
    campos.orden,
    campos.ayuda_texto
FROM plantilla
CROSS JOIN campos
LEFT JOIN variables_clinicas vc
    ON vc.codigo = campos.variable_codigo
ON CONFLICT DO NOTHING;

INSERT INTO motivos_cancelacion (codigo, nombre, descripcion, aplica_a, requiere_observacion)
VALUES
('PACIENTE_NO_DISPONIBLE', 'Paciente no disponible', 'El paciente no se encontraba disponible para la atención.', 'VISITA', TRUE),
('PROFESIONAL_NO_DISPONIBLE', 'Profesional no disponible', 'El profesional asignado no pudo realizar la visita.', 'VISITA', TRUE),
('DIRECCION_INCORRECTA', 'Dirección incorrecta', 'No fue posible realizar la atención por problemas con la dirección.', 'VISITA', TRUE),
('CONDICION_CLINICA_CAMBIA', 'Cambio en condición clínica', 'La condición clínica del paciente cambió y se requiere modificar la visita.', 'VISITA', TRUE),
('OTRO', 'Otro motivo', 'Otro motivo de cancelación.', 'GENERAL', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO motivos_reprogramacion (codigo, nombre, descripcion, requiere_observacion)
VALUES
('AJUSTE_AGENDA', 'Ajuste de agenda', 'Cambio de fecha u hora por reorganización de agenda.', TRUE),
('SOLICITUD_PACIENTE', 'Solicitud del paciente', 'El paciente o cuidador solicita modificar la visita.', TRUE),
('SOLICITUD_PROFESIONAL', 'Solicitud del profesional', 'El profesional solicita modificar la visita.', TRUE),
('CAMBIO_PRIORIDAD', 'Cambio de prioridad', 'Se reprograma por priorización de otra atención.', TRUE),
('OTRO', 'Otro motivo', 'Otro motivo de reprogramación.', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO reglas_asignacion (codigo, nombre, descripcion, prioridad, condiciones, acciones)
VALUES
(
    'RESPETAR_DISPONIBILIDAD',
    'Respetar disponibilidad profesional',
    'Sugiere asignar visitas solo dentro de bloques disponibles del profesional.',
    1,
    '{"validar_disponibilidad": true}'::jsonb,
    '{"bloquear_fuera_de_horario": true}'::jsonb
),
(
    'PACIENTE_URGENTE',
    'Priorizar pacientes urgentes',
    'Sugiere atender primero visitas marcadas con prioridad urgente.',
    5,
    '{"prioridad_visita": "URGENTE"}'::jsonb,
    '{"ordenar_primero": true}'::jsonb
),
(
    'MISMA_ZONA',
    'Priorizar profesional de la misma zona',
    'Sugiere asignar visitas a profesionales asociados a la misma zona del paciente.',
    10,
    '{"requiere_misma_zona": true}'::jsonb,
    '{"priorizar_profesional_zona": true}'::jsonb
)
ON CONFLICT DO NOTHING;

COMMIT;

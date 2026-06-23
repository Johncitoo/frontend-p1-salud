# Documentación de Endpoints y Correspondencia con la Base de Datos Online

Este documento detalla los endpoints que consume la aplicación móvil (`frontappsalud`) mediante su servicio de sincronización (`syncService.ts`), indicando su estado actual, cómo se relacionan con las tablas de la base de datos online (`bd.sql`) y cómo se están resolviendo en el nuevo backend `appBack`.

---

## Resumen del Estado de los Endpoints

| Endpoint | Método | Estado en Backend Web Anterior | Estado Actual en `appBack` | Tabla de la BD Online (`bd.sql`) |
| :--- | :---: | :---: | :---: | :--- |
| `/visitas?profesionalId={id}` | `GET` | **No existía** (Estructura incompatible) | **Implementado y Operativo** | `visitas`, `pacientes`, `direcciones_paciente` |
| `/plantillas-ficha` | `GET` | **Incompatible** (Retornaba campos separados) | **Implementado y Operativo** | `plantillas_ficha`, `plantilla_ficha_campos` |
| `/visitas/checkpoint` | `POST` | **No existía** (Retornaba 404) | **Implementado y Operativo** | `visita_checkpoints`, `visitas` |
| `/fichas-clinicas` | `POST` | **Incompatible** (Esquema no adaptado al sobre offline) | **Implementado y Operativo** | `fichas_clinicas` |

---

## Detalles de Endpoints y Mapeo a Base de Datos

### 1. Descarga de Visitas del Día (`GET /visitas?profesionalId={id}`)
*   **Propósito**: Obtener la lista de visitas asignadas al profesional para el día actual con toda la información de dirección y paciente necesaria para operar offline.
*   **En la Base de Datos Online (`bd.sql`)**: 
    *   Filtra las visitas en la tabla `visitas` donde `profesional_salud_id = profesionalId` y `fecha_programada = CURRENT_DATE`.
    *   Realiza un `JOIN` con la tabla `pacientes` (para obtener `nombres`, `apellidos`, `rut`).
    *   Realiza un `JOIN` con la tabla `direcciones_paciente` (para obtener `calle`, `numero`, `comuna`).
*   **Formato de respuesta esperado por la App**:
    ```json
    [
      {
        "id": "10000000-1111-4111-a111-100000000000",
        "hora": "10:30",
        "estado": "PROGRAMADA",
        "prioridad": "ALTA",
        "paciente": {
          "nombres": "Pedro",
          "apellidos": "Mármol",
          "rut": "12.345.678-9"
        },
        "direccion": {
          "calle": "Av. Las Rosas",
          "numero": "450",
          "comuna": "La Florida"
        },
        "prestacion": "Control de Signos y Curación"
      }
    ]
    ```

---

### 2. Plantillas Clínicas Dinámicas (`GET /plantillas-ficha`)
*   **Propósito**: Descargar los formularios clínicos dinámicos estructurados en el backend para poder renderizarlos en el móvil sin necesidad de conexión.
*   **En la Base de Datos Online (`bd.sql`)**:
    *   Lee los registros de la tabla `plantillas_ficha`.
    *   Une sus campos asociados de la tabla `plantilla_ficha_campos`.
    *   Para los campos enlazados a variables normalizadas, resuelve sus propiedades en `variables_clinicas`.
*   **Adaptación en `appBack`**: El nuevo backend junta las plantillas y los campos en una sola consulta, y convierte las opciones de tipo JSONB en arreglos de cadenas planos (`string[]`), listos para ser renderizados en los controles selectores del celular.
*   **Formato de respuesta**:
    ```json
    [
      {
        "id": "11111111-1111-4111-a111-111111111111",
        "codigo": "CONTROL_GENERAL",
        "nombre": "Control de Signos Vitales (General)",
        "campos": [
          {
            "codigo": "temperatura",
            "etiqueta": "Temperatura Corporal (°C)",
            "tipo": "NUMERO_LIBRE",
            "obligatorio": true,
            "placeholder": "Ej: 36.5"
          },
          {
            "codigo": "estado_herida",
            "etiqueta": "Estado de la Herida",
            "tipo": "SELECT",
            "obligatorio": true,
            "opciones": ["Limpia / Granulando", "Eritematosa", "Necrótica", "Infectada / Con secreción"]
          }
        ]
      }
    ]
    ```

---

### 3. Registro de Checkpoints GPS (`POST /visitas/checkpoint`)
*   **Propósito**: Registrar eventos georreferenciados de inicio de atención (`CHECK_IN`) y finalización (`CHECK_OUT`) capturados por la app.
*   **En la Base de Datos Online (`bd.sql`)**:
    *   Inserta un registro en la tabla `visita_checkpoints` con campos como `visita_id`, `tipo` (`CHECK_IN` / `CHECK_OUT`), `latitud`, `longitud`, `fecha_hora` (derivada del timestamp enviado) y `origen = 'OFFLINE_SYNC'`.
    *   Actualiza el campo `estado` de la tabla `visitas` a `'EN_ATENCION'` (para `CHECK_IN`) o `'REALIZADA'` (para `CHECK_OUT`). También setea `check_in_at` o `check_out_at`.
*   **Cuerpo enviado por la App (Payload)**:
    ```json
    {
      "visita_id": "10000000-1111-4111-a111-100000000000",
      "tipo": "CHECK_IN",
      "data": {
        "latitud": -33.456,
        "longitud": -70.648
      },
      "timestamp": 1718563200000
    }
    ```

---

### 4. Sincronización de Ficha Clínica y Trazabilidad (`POST /fichas-clinicas`)
*   **Propósito**: Subir los datos del formulario clínico completados por el profesional en terreno junto con la firma digital de conformidad del cuidador.
*   **En la Base de Datos Online (`bd.sql`)**:
    *   Crea o actualiza un registro en la tabla `fichas_clinicas` con `estado = 'CERRADA'`.
    *   Guarda todo el cuerpo en el campo flexible `contenido` de tipo `JSONB`.
*   **Adaptación en `appBack`**: El móvil envía un payload en formato de "sobre" (envelope) conteniendo metadatos y un sub-objeto `data`. El backend desempaqueta de forma inteligente esta estructura para fusionar el contenido del formulario clínico (`data.contenido`), las observaciones generales (`data.observaciones`), las prestaciones realizadas (`data.prestaciones_realizadas`) y los datos de firma digital táctil (`data.conformidad`) en una única columna `contenido` JSONB.
*   **Cuerpo enviado por la App (Payload)**:
    ```json
    {
      "visita_id": "10000000-1111-4111-a111-100000000000",
      "tipo": "FICHA_CLINICA",
      "data": {
        "plantilla_ficha_id": "11111111-1111-4111-a111-111111111111",
        "contenido": {
          "presion": "120/80",
          "temperatura": 36.6,
          "saturacion": 98,
          "pulso": 72
        },
        "observaciones": "El paciente cooperó durante toda la sesión.",
        "prestaciones_realizadas": ["Control de Signos y Curación"],
        "check_out_at": "11:15",
        "conformidad": {
          "nombre": "María Gómez (Hija)",
          "rut": "18.456.789-0",
          "firma_token": "HASH_MOCK_SIGNATURE_1718563200000"
        }
      },
      "timestamp": 1718563200000
    }
    ```

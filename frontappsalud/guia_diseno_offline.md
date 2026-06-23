# Guía de Diseño y Flujo: App Móvil de Salud Domiciliaria (Offline-First)

Esta guía detalla los requerimientos visuales, el flujo de usuario paso a paso y la arquitectura de datos necesaria para construir el Frontend móvil (PWA o aplicación nativa) enfocado en los profesionales de salud en terreno, garantizando su funcionamiento **100% sin conexión a internet (offline)**.

---

## 1. Arquitectura del Flujo de Datos (Sincronización Offline)

Para que la aplicación funcione offline, el navegador o el dispositivo móvil debe actuar como un servidor local temporal. Utilizaremos **IndexedDB** como base de datos local (se recomienda usar librerías como **Dexie.js** o **localForage** para facilitarlo).

```mermaid
flowchart TD
    subgraph Servidor (Railway PostgreSQL)
        DB[(Base de Datos Central)] <--> API[API REST / Next.js]
    end

    subgraph Cliente Móvil (Celular del Profesional)
        API <-->|1. Sincronización Inicial (Con Internet)| SW[Service Worker / Cache]
        API <-->|2. Descarga de Datos de Visitas| LDB[(IndexedDB Local)]
        
        UI[Pantallas de la App] <-->|3. Lectura/Escritura en Caliente| LDB
        UI -->|4. Registro de Atenciones| Queue[Cola de Sincronización en IndexedDB]
        
        Queue -->|5. Envío en Segundo Plano (Al recuperar señal)| API
    end
```

---

## 2. Flujo de Usuario Paso a Paso (User Journey)

### Paso 1: Inicio de Jornada y Sincronización Activa (Requiere Internet)
*   **Acción del Profesional**: Abre la app en la mañana (en su casa o la clínica, con conexión a internet) e inicia sesión.
*   **Acción de la App**:
    1.  Consulta el perfil de identidad (Autenticación del Proyecto 12).
    2.  Descarga las **Visitas Programadas** asignadas a su ID para el día de hoy (desde la tabla `visitas`).
    3.  Descarga los datos de los **Pacientes** y sus **Direcciones** relacionados con esas visitas.
    4.  Descarga las **Plantillas de Ficha** (`plantillas_ficha` y `plantilla_ficha_campos`) y el catálogo de **Variables Clínicas**.
    5.  Almacena todo localmente en la base de datos `IndexedDB`.
*   **UI/UX**: Pantalla con una barra de progreso limpia: *"Descargando agenda del día... Listo para trabajar sin conexión"*.

### Paso 2: Vista de Itinerario (Funciona Offline)
*   **Acción del Profesional**: Visualiza su ruta del día en el celular.
*   **Acción de la App**: Carga la lista de visitas directamente desde `IndexedDB`. No hace peticiones de red.
*   **UI/UX**:
    *   Tarjetas (Cards) de pacientes ordenadas cronológicamente.
    *   Indicadores visuales de prioridad clínica:
        *   🔴 **Urgente / Alta**: Pacientes frágiles o con alta tasa de reingreso (priorizados en la asignación).
        *   🟡 **Normal**.
        *   🔵 **Baja**.
    *   Cada tarjeta muestra el estado de la visita: `PROGRAMADA`, `EN_CAMINO`, `EN_ATENCION`, `REALIZADA`.

### Paso 3: En Camino y Check-In (Funciona Offline)
*   **Acción del Profesional**: Se desplaza al domicilio y presiona *"Iniciar Camino"*, y al llegar presiona *"Registrar Entrada" (Check-in)*.
*   **Acción de la App**:
    1.  Obtiene las coordenadas del dispositivo usando la API de Geolocalización del celular (`navigator.geolocation`).
    2.  Registra la fecha y hora exacta del dispositivo.
    3.  Guarda este checkpoint en la **Cola de Sincronización** local (`IndexedDB`) con tipo `CHECK_IN` y estado `PENDIENTE_SINCRO`.
*   **UI/UX**:
    *   Botón grande, verde y prominente: **"Registrar Check-In"**.
    *   Al presionarlo, cambia a un estado activo con un cronómetro que muestra el tiempo transcurrido de atención.

### Paso 4: Llenado de Ficha Clínica y Mediciones (Funciona Offline)
*   **Acción del Profesional**: Evalúa al paciente y rellena la ficha.
*   **Acción de la App**:
    1.  Renderiza el formulario dinámicamente utilizando los campos descargados de `plantilla_ficha_campos` (texto libre, selección múltiple, etc.).
    2.  **Validación en caliente**: Si el profesional escribe un valor fuera de rango para signos vitales (ej: Temperatura `3.5` en vez de `35` o `38`), el input se pinta de rojo y muestra una alerta: *"Valor fuera de límites normales para esta variable"*.
    3.  **Autoguardado**: Cada 15 segundos o al cambiar de pestaña, escribe los borradores en `IndexedDB`.
*   **UI/UX**:
    *   Pestañas o acordeón:
        1.  *Historial y Plan General* (Motivo de ingreso, planes previos).
        2.  *Signos Vitales* (Entrada numérica grande).
        3.  *Procedimientos y Prestaciones* (Checklist de tareas realizadas).
        4.  *Fotos y Notas* (Botón para tomar foto con la cámara y guardarla en base64 en IndexedDB).

### Paso 5: Validación y Check-Out (Funciona Offline)
*   **Acción del Profesional**: Termina la atención y presiona *"Cerrar Visita y Registrar Salida" (Check-out)*.
*   **Acción de la App**:
    1.  Verifica que todos los campos requeridos (`obligatorio = true`) contengan información.
    2.  Valida criterios de continuidad: Si el paciente es frágil y tiene seguimientos pendientes, le advierte al profesional: *"¿Requiere segunda visita? Asegure programar la continuidad en el plan"*.
    3.  Captura la ubicación GPS final del Check-out.
    4.  Guarda en la cola local los datos de la ficha (`fichas_clinicas`), mediciones (`mediciones_clinicas`), fotos (`documentos_adjuntos`) y el checkpoint de salida (`CHECK_OUT`).
*   **UI/UX**:
    *   Resumen visual de los datos cargados para confirmar.
    *   Mensaje de éxito: *"Atención guardada localmente. Lista para ser sincronizada"*.

### Paso 6: Sincronización en Segundo Plano (Cuando vuelve el Internet)
*   **Acción de la App**: 
    1.  Monitorea constantemente la conexión.
    2.  Cuando `navigator.onLine` es verdadero y la API responde, procesa la cola de sincronización uno por uno (FIFO: First-In, First-Out).
    3.  Envía primero el Check-in, luego la Ficha Clínica con sus mediciones y fotos, y finalmente el Check-out.
    4.  Una vez que el servidor confirma la recepción exitosa con código `200 OK`, la app elimina ese registro de la cola local.
*   **UI/UX**: Pequeño indicador persistente en la esquina: *"Sincronizando atenciones pendientes (Quedan: 2)..."* que pasa a *"Datos totalmente actualizados"* con un check verde.

---

## 3. Estructura de Base de Datos Local Recomendada (IndexedDB / Dexie)

Para sostener este flujo offline, tu base de datos local en el celular debe tener este esquema simplificado:

```typescript
// Configuración de base de datos local en Dexie.js
import Dexie, { type Table } from 'dexie';

export interface LocalVisita {
  id: string; // UUID
  paciente_id: string;
  nombre_paciente: string;
  direccion: string;
  fecha_programada: string;
  hora_programada: string;
  estado: string;
  prioridad: string;
}

export interface LocalPlantilla {
  id: string;
  codigo: string;
  nombre: string;
  campos: any[]; // Campos dinámicos del formulario
}

export interface SyncQueueItem {
  id?: number; // Auto-incremental local
  tipo: 'CHECK_IN' | 'CHECK_OUT' | 'FICHA_CLINICA' | 'MEDICION' | 'FOTO';
  visita_id: string;
  data: any; // El JSON con los datos a enviar a la API REST
  timestamp: number;
}

class ClinicaOfflineDB extends Dexie {
  visitas!: Table<LocalVisita>;
  plantillas!: Table<LocalPlantilla>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('ClinicaOfflineDB');
    this.version(1).stores({
      visitas: 'id, fecha_programada, estado',
      plantillas: 'id, codigo',
      syncQueue: '++id, tipo, visita_id, timestamp'
    });
  }
}

export const db = new ClinicaOfflineDB();
```

---

## 4. Requerimientos Visuales y de Interfaz Móvil (UI Blueprint)

### A. Elementos de Feedback de Conexión (Persistent Header)
*   **Online**:
    ```
    [ 🏥 Salud Domiciliaria ]  [🟢 En línea]
    ```
*   **Offline**:
    ```
    [ 🏥 Salud Domiciliaria ]  [🟡 Sin conexión - Local]
    ```

### B. Formulario de Mediciones Rápidas (Inputs de Signos Vitales)
*   Para evitar errores tipográficos en dispositivos táctiles, utiliza interfaces de control de rango o tarjetas numéricas directas:

```
+-----------------------------------------------------+
| 🫀 PRESIÓN ARTERIAL (Sistólica / Diastólica)       |
| [ 120 ] mmHg  -  [ 80 ] mmHg                       |
| ( Teclado numérico activado por defecto )          |
+-----------------------------------------------------+
| 🌡️ TEMPERATURA CORPORAL                             |
|    -   [ 36.5 ] °C   +                              |
| ( Botones grandes de más/menos para ajuste rápido ) |
+-----------------------------------------------------+
```

### C. Alertas de Seguridad en Pantalla
*   **Validaciones Críticas**: Si hay mediciones anómalas (ej: Saturación de Oxígeno < 90%), mostrar un banner rojo intermitente:
    > ⚠️ **ALERTA CLÍNICA**: Paciente con hipoxia. Considere reportar de inmediato o llamar a soporte médico.

---

## 5. Pruebas que debes realizar en tu Frontend (Requisitos de Testing)

1.  **Test de Modo Avión**: Abre la app con internet, inicia el día para descargar datos, luego pon el celular en modo avión y simula una atención completa. Valida que:
    *   No haya pantallas en blanco o bloqueos.
    *   Se guarden los datos del Check-in, Ficha y Check-out localmente.
2.  **Test de Reconexión Abrupta**: Apaga el internet a mitad de un formulario, continúa escribiendo, recupera el internet y verifica que la app realice la sincronización en segundo plano automáticamente sin duplicar registros en la base de datos central.
3.  **Test de Batería y Pérdida de Foco**: Sal de la aplicación a mitad del llenado de una ficha (abre la cámara o recibe una llamada). Regresa y comprueba que el autoguardado haya respaldado los datos en el punto exacto donde los dejaste.

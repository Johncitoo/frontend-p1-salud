# Plan de Implementación: Características Avanzadas de Movilidad (App Terreno)

Este documento detalla el plan técnico para incorporar las cuatro características de movilidad avanzada solicitadas por el usuario:
1.  **Validación de Continuidad y Agendamiento (Paciente Frágil)**.
2.  **Panel de Sincronización y Simulación Offline** (Nueva pantalla de Ajustes).
3.  **Checklists de Protocolos Clínicos de Seguridad** (Gobernanza clínica).
4.  **Firma Táctil Digital de Conformidad** (Trazabilidad y seguridad).

---

## 1. Cambios Propuestos por Componente

### A. Enrutador y Navegación Central
#### [MODIFY] [App.tsx](file:///c:/Users/monse/Downloads/frontappsalud/App.tsx)
*   Ampliar los estados de pantalla en `currentScreen` para soportar `'LOGIN' | 'ITINERARY' | 'VISIT_DETAIL' | 'SETTINGS'`.
*   Agregar una **Barra de Navegación Inferior (Bottom Tab Bar)** persistente cuando el usuario esté dentro del sistema (es decir, en cualquier pantalla distinta de `LOGIN`). La barra tendrá dos pestañas:
    *   📅 **Itinerario** (redirecciona a `ITINERARY`).
    *   ⚙️ **Ajustes / Sync** (redirecciona a `SETTINGS`).
*   Centralizar el estado de conexión a internet (`isOnline`) y propagarlo a los componentes para simular la conectividad de red de forma unificada.
*   Agregar una función para crear una visita de seguimiento local: `handleCrearVisitaSeguimiento(pacienteId)`. Esto insertará una nueva visita para el día siguiente directamente en el estado central y en IndexedDB (`db.visitas`), lo que reflejará la continuidad inmediatamente en el Itinerario.

---

### B. Nueva Pantalla de Ajustes y Control Offline
#### [NEW] [SettingsScreen.tsx](file:///c:/Users/monse/Downloads/frontappsalud/src/screens/SettingsScreen.tsx)
Crear una pantalla dedicada que permita al profesional:
*   Visualizar el estado actual de la conexión a internet (`isOnline`) mediante un control interactivo (un Switch de simulación de señal).
*   Visualizar la **Cola de Sincronización Local** de Dexie (`db.syncQueue`). Listará las acciones pendientes (Check-ins, Fichas Clínicas, Firmas) y sus marcas de tiempo.
*   Botón **"Sincronizar Cola Ahora"**: Invoca al servicio `syncService.sincronizarRegistrosPendientes()` si hay señal de internet.
*   Estadísticas del almacenamiento: Espacio simulado consumido, cantidad de plantillas clínicas cacheadas e historial.

---

### C. Ficha Clínica e Interacciones Médicas
#### [MODIFY] [VisitDetailScreen.tsx](file:///c:/Users/monse/Downloads/frontappsalud/src/screens/VisitDetailScreen.tsx)
*   **Checklist de Protocolo de Seguridad**:
    *   Agregar un catálogo de protocolos clínicos en base a la prestación (ej. curación, kinesioterapia respiratoria, antibióticos).
    *   En la pestaña de **Consulta**, renderizar este checklist antes del formulario clínico.
    *   **Regla de bloqueo**: El botón de "Finalizar Atención" estará deshabilitado o arrojará un error si el profesional no ha marcado todos los checks de seguridad del protocolo.
*   **Firma Digital de Conformidad (Checkout)**:
    *   Al presionar "Finalizar", si las validaciones del formulario y el protocolo pasan, abrir un modal flotante.
    *   El modal solicitará el nombre y RUT del cuidador o paciente.
    *   Tendrá un recuadro interactivo simulado de **Firma Táctil** (un lienzo táctil simplificado donde el usuario dibuja con el dedo o confirma mediante un checkbox y patrón táctil de aceptación).
    *   La firma se guardará como parte de los datos clínicos de la ficha.
*   **Ventana de Continuidad (Paciente Frágil)**:
    *   Al completar la firma y cerrar la atención, si el paciente tiene diagnóstico de EPOC o Demencia (marcados en la base de datos como "Paciente Frágil"), la app mostrará un popup:
        > ⚠️ **Control de Continuidad**: Paciente Frágil detectado. Se sugiere control de seguimiento para mañana. ¿Deseas agendar visita ahora?
    *   Si acepta, la app invoca `handleCrearVisitaSeguimiento` y registra automáticamente la nueva visita.

---

### D. Lista de Visitas
#### [MODIFY] [ItineraryScreen.tsx](file:///c:/Users/monse/Downloads/frontappsalud/src/screens/ItineraryScreen.tsx)
*   Eliminar el switch local de conexión a internet y el botón local de sincronización, ya que estos serán administrados globalmente desde la nueva pantalla de Ajustes.
*   El indicador de red superior simplemente leerá el estado central de `isOnline` heredado por prop.

---

## 2. Plan de Verificación y Testing

### Pruebas de Flujo End-to-End (Simulado Offline)
1.  **Simular Sin Conexión**: Ir a *Ajustes*, apagar el interruptor de internet (`isOnline = false`).
2.  **Operación en Terreno**: Ir al *Itinerario*, entrar a un paciente, hacer *Check-in*, llenar la ficha clínica, completar el *checklist del protocolo* médico y capturar la firma digital de conformidad.
3.  **Verificación de Cola**: Ir a *Ajustes*. Comprobar que en la lista de sincronización aparezcan encolados los eventos.
4.  **Reconexión y Subida**: Activar internet (`isOnline = true`) y presionar "Sincronizar Cola". Verificar que la lista de la cola se vacíe y el estado de la visita del paciente en el Itinerario se muestre como exitoso y al fondo de la lista.
5.  **Continuidad**: Finalizar la atención de un paciente frágil, presionar "Sí" en el aviso de seguimiento, y verificar que aparezca una nueva tarjeta de visita agendada en el Itinerario.

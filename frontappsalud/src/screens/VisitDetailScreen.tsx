import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, TextInput, Switch, Platform, Alert, Modal, ActivityIndicator, Linking } from 'react-native';
import { theme } from '../theme';
import { Box, VStack, HStack } from '../components/Layout';
import { Label } from '../components/Label';
import { FormInput } from '../components/Input';
import { PrimaryButton, SecondaryButton, OutlineButton } from '../components/Button';
import { ArrowLeft, MapPin, ClipboardList, CheckSquare, Camera, Check, PenTool } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { syncService } from '../services/syncService';

// Catálogo de Plantillas Clínicas Simuladas (Configurable / Dinámicas)
const MOCK_PLANTILLAS = [
  {
    id: "p1",
    codigo: "CONTROL_GENERAL",
    nombre: "Control de Signos Vitales (General)",
    campos: [
      { codigo: "presion", etiqueta: "Presión Arterial (Sistólica/Diastólica)", tipo: "TEXTO_LIBRE", obligatorio: true, placeholder: "Ej: 120/80" },
      { codigo: "temperatura", etiqueta: "Temperatura Corporal (°C)", tipo: "NUMERO_LIBRE", obligatorio: true, placeholder: "Ej: 36.5" },
      { codigo: "saturacion", etiqueta: "Saturación de Oxígeno (%)", tipo: "NUMERO_LIBRE", obligatorio: true, placeholder: "Ej: 98" },
      { codigo: "pulso", etiqueta: "Frecuencia Cardíaca (LPM)", tipo: "NUMERO_LIBRE", obligatorio: false, placeholder: "Ej: 75" },
    ]
  },
  {
    id: "p2",
    codigo: "CURACION_HERIDAS",
    nombre: "Ficha de Curación de Heridas",
    campos: [
      { codigo: "tipo_herida", etiqueta: "Tipo de Herida", tipo: "TEXTO_LIBRE", obligatorio: true, placeholder: "Ej: Quirúrgica, Escara por presión" },
      { codigo: "estado_herida", etiqueta: "Estado de la Herida", tipo: "SELECT", obligatorio: true, opciones: ["Limpia / Granulando", "Eritematosa", "Necrótica", "Infectada / Con secreción"] },
      { codigo: "exudado", etiqueta: "Presenta Exudado / Secreción activa", tipo: "BOOLEANO", obligatorio: false },
      { codigo: "dolor_eva", etiqueta: "Nivel de Dolor en la Curación (Escala EVA 1-10)", tipo: "NUMERO_LIBRE", obligatorio: true, placeholder: "Ej: 4" },
    ]
  },
  {
    id: "p3",
    codigo: "KINESIOLOGIA",
    nombre: "Ficha de Kinesiología Respiratoria/Motora",
    campos: [
      { codigo: "sat_pre", etiqueta: "Saturación Pre-Ejercicio (%)", tipo: "NUMERO_LIBRE", obligatorio: true, placeholder: "Ej: 93" },
      { codigo: "sat_post", etiqueta: "Saturación Post-Ejercicio (%)", tipo: "NUMERO_LIBRE", obligatorio: true, placeholder: "Ej: 96" },
      { codigo: "disnea_borg", etiqueta: "Grado de Disnea Percibida (Escala de Borg)", tipo: "SELECT", obligatorio: true, opciones: ["0 - Ninguna", "1-2 - Muy Leve", "3-4 - Moderada", "5-6 - Severa", "7-10 - Muy Severa"] },
      { codigo: "ejercicios", etiqueta: "Detalle de Ejercicios Realizados", tipo: "TEXTO_LIBRE", obligatorio: false, placeholder: "Ej: Espirometría incentivada, caminata..." },
    ]
  }
];

// Protocolos Clínicos de Seguridad obligatorios por tipo de formulario
const MOCK_PROTOCOLOS: Record<string, string[]> = {
  "CONTROL_GENERAL": [
    "Identificar al paciente verbalmente y mediante RUT.",
    "Lavar y desinfectar manos antes de la atención.",
    "Asegurar reposo previo de 5 minutos antes de medir presión arterial.",
    "Sanitizar manguito y termómetro antes y después del uso."
  ],
  "CURACION_HERIDAS": [
    "Identificar al paciente verbalmente y mediante RUT.",
    "Lavar manos clínico y colocar guantes estériles.",
    "Retirar apósito sucio evaluando signos de infección local.",
    "Realizar lavado por arrastre mecánico con suero fisiológico.",
    "Instalar apósito primario/secundario y rotular fecha de curación."
  ],
  "KINESIOLOGIA": [
    "Identificar al paciente verbalmente y mediante RUT.",
    "Tomar saturación de oxígeno basal y pulso en reposo.",
    "Auscultar campos pulmonares antes del ejercicio físico.",
    "Vigilar tolerancia clínica; suspender inmediatamente si satura <90%."
  ]
};

// Alergias: backend-p1-salud no tiene ninguna entidad para esto todavía (ni
// endpoint ni columna en Paciente), así que no hay dato real que mostrar. En vez
// de fabricar contenido por paciente, se muestra siempre este aviso honesto.
// (Los medicamentos sí tienen entidad propia ahora — ver src/medicamentos/ en
// el backend — y se editan directamente en la pestaña "Historial".)
const SIN_DATOS_ALERGIAS = {
  alergias: ["Sin datos disponibles: el backend aún no registra alergias por paciente."],
};

function calcularEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "N/A";
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return "N/A";
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple = hoy.getMonth() < nacimiento.getMonth()
    || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  return `${edad} años`;
}

interface VisitDetailScreenProps {
  visita: any;
  plantillas: any[];
  catalogoMedicamentos?: any[];
  onBack: () => void;
  onUpdateVisitaState: (visitaId: string, nuevoEstado: string, datosConsulta?: any) => void;
  onRegisterAttention: (tipo: 'EN_CAMINO' | 'CHECK_IN' | 'CHECK_OUT' | 'FICHA_CLINICA' | 'DIAGNOSTICO' | 'MEDICAMENTO', visitaId: string, data: any) => Promise<void>;
  onScheduleFollowUp: (visitaBase: any) => void;
}

export default function VisitDetailScreen({ visita, plantillas, catalogoMedicamentos, onBack, onUpdateVisitaState, onRegisterAttention, onScheduleFollowUp }: VisitDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<'DOMICILIO' | 'HISTORIAL' | 'CONSULTA'>('DOMICILIO');
  const [estadoVisita, setEstadoVisita] = useState(visita.estado);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // Control de Modales de Alergias, Medicación y Firma
  const [showAllergiesModal, setShowAllergiesModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Estados del Formulario de Firma
  const [signerName, setSignerName] = useState("");
  const [signerRut, setSignerRut] = useState("");
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Plantillas dinámicas provenientes del backend
  const templatesList = plantillas && plantillas.length > 0 ? plantillas : MOCK_PLANTILLAS;
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    if (templatesList && templatesList.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templatesList[0].id);
    }
  }, [templatesList]);

  // Fichas guardadas en la consulta actual
  const [fichasCompletadas, setFichasCompletadas] = useState<any[]>([]);

  // Diccionario dinámico para guardar las respuestas del formulario de la ficha activa
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [observaciones, setObservaciones] = useState("");

  // Diagnóstico y medicamentos: se registran en la pestaña "Historial" (no en
  // "Consulta") y viajan a tablas propias (diagnosticos, medicamentos) en
  // backend-p1-salud, independientes de la ficha clínica.
  const [diagnostico, setDiagnostico] = useState("");
  const [medicamentos, setMedicamentos] = useState<
    Array<{ medicamentoCatalogoId: string; nombre: string; cantidadCajas: number }>
  >([]);

  // Catálogo de medicamentos para el selector (combobox + contador de cajas):
  // viene siempre de la tabla real `medicamentos_catalogo`, importada a Dexie
  // por syncService.descargarDatosDelDia. Sin mock: si todavía no se ha
  // sincronizado nunca, la lista queda vacía y el picker lo indica.
  // Se ordena acá porque Dexie devuelve las filas en orden de id (UUID), no en
  // el orden alfabético que ya trae el backend.
  const catalogoMedicamentosList = [...(catalogoMedicamentos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const [showMedicamentoPicker, setShowMedicamentoPicker] = useState(false);
  const [medicamentoSeleccionado, setMedicamentoSeleccionado] = useState<{ id: string; nombre: string; presentacion?: string | null } | null>(null);
  const [cantidadCajas, setCantidadCajas] = useState(1);

  // Checklist de protocolos clínicos
  const [protocolChecked, setProtocolChecked] = useState<Record<number, boolean>>({});

  // Checklist de prestaciones y fotos
  const [prestacionCompletada, setPrestacionCompletada] = useState(false);
  const [currentFotoUrl, setCurrentFotoUrl] = useState<string | null>(null);
  const [currentFotoMimeType, setCurrentFotoMimeType] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingSensor, setIsReadingSensor] = useState(false);

  // Signos vitales del kit portátil de sensores IoT (Proyecto 8), obtenidos
  // automáticamente al hacer check-in. { codigoVariable: valor }, ej.
  // { frecuencia_cardiaca: 74, saturacion_oxigeno: 96, ... }.
  const [signosVitalesIot, setSignosVitalesIot] = useState<Record<string, number>>({});

  // Detalle real del paciente (dirección/referencia, cuidador, plan de cuidado,
  // historial de mediciones), traído de backend-p1-salud. Reemplaza el mock anterior.
  const [detallePaciente, setDetallePaciente] = useState<any>(null);

  useEffect(() => {
    let cancelado = false;
    if (!visita.pacienteId) return;
    syncService.obtenerDetallePaciente(visita.pacienteId)
      .then(detalle => { if (!cancelado) setDetallePaciente(detalle); })
      .catch(err => console.error('Error al obtener detalle real del paciente:', err));
    return () => { cancelado = true; };
  }, [visita.pacienteId]);

  // Buscar objeto de plantilla actual
  const currentTemplate = templatesList.find(p => p.id === selectedTemplateId) || templatesList[0] || MOCK_PLANTILLAS[0];

  // ¿Esta plantilla tiene algún campo que se pueda auto-completar con un
  // sensor IoT? Cubre tanto los códigos de las plantillas mock/offline como
  // el código de variable clínica real de las plantillas sincronizadas.
  const CODIGOS_CON_SENSOR = new Set([
    'temperatura', 'saturacion', 'sat_pre', 'sat_post', 'pulso', 'presion',
    'saturacion_oxigeno', 'frecuencia_cardiaca',
    'presion_arterial_sistolica', 'presion_arterial_diastolica', 'glicemia_capilar',
  ]);
  const tieneCamposDeSensor = currentTemplate.campos.some((c: any) =>
    CODIGOS_CON_SENSOR.has(c.codigo) || (c.variableCodigo && CODIGOS_CON_SENSOR.has(c.variableCodigo))
  );
  const listadoProtocolos = MOCK_PROTOCOLOS[currentTemplate.codigo] || [
    "Verificar identidad del paciente.",
    "Lavar manos antes del procedimiento.",
    "Registrar parámetros clínicos."
  ];

  // Efecto para cargar datos ya guardados si se cambia de plantilla (Edición)
  useEffect(() => {
    if (!selectedTemplateId) return;
    const existing = fichasCompletadas.find(f => f.plantillaId === selectedTemplateId);
    if (existing) {
      setFormData(existing.contenido || {});
      setObservaciones(existing.observaciones || "");
      setCurrentFotoUrl(existing.fotoUrl || null);
      setCurrentFotoMimeType(existing.fotoMimeType || null);

      const preChecked: Record<number, boolean> = {};
      listadoProtocolos.forEach((_, idx) => {
        preChecked[idx] = true;
      });
      setProtocolChecked(preChecked);
    } else {
      setFormData({});
      setObservaciones("");
      setCurrentFotoUrl(null);
      setCurrentFotoMimeType(null);
      setProtocolChecked({});
    }
  }, [selectedTemplateId]);

  // Detalles clínicos reales (backend-p1-salud): dirección/referencia, cuidador y plan
  // de cuidado. Los campos sin respaldo real en el backend (previsión) quedan "N/A"
  // en vez de inventarse. No existe ningún concepto de "paciente frágil" en el
  // backend hoy, así que esa señal ya no se muestra ni se auto-detecta.
  const cuidadorReal = detallePaciente?.cuidador;
  const planReal = detallePaciente?.planCuidado;
  const detallesClinicos = {
    rut: visita.paciente.rut || "N/A",
    edad: calcularEdad(detallePaciente?.paciente?.fechaNacimiento),
    sexo: detallePaciente?.paciente?.sexo || "N/A",
    prevision: "N/A",
    cuidador: cuidadorReal
      ? `${cuidadorReal.nombre}${cuidadorReal.relacion ? ` (${cuidadorReal.relacion})` : ''}${cuidadorReal.telefono ? ` - ${cuidadorReal.telefono}` : ''}`
      : "No hay contacto de cuidador registrado",
    referencia: detallePaciente?.direccionPrincipal?.referencia || "No especificada",
    historial: detallePaciente?.historial ?? [],
    plan_cuidado: planReal
      ? { objetivo: planReal.objetivo || "No especificado", descripcion: planReal.descripcion || "Sin descripción", estado: planReal.estado || "N/A" }
      : { objetivo: "No hay plan de cuidado registrado", descripcion: "", estado: "N/A" },
  };

  // Alergias: sin respaldo en el backend todavía (ver constante arriba).
  const historialFarmacologico = SIN_DATOS_ALERGIAS;

  // Trae la última lectura real de los sensores IoT (Proyecto 8) asignados a
  // este paciente y actualiza signosVitalesIot; el useEffect de auto-completado
  // se encarga de volcar los valores a los campos vacíos del formulario.
  const handleLeerSensores = async () => {
    if (!visita.pacienteId) return;
    setIsReadingSensor(true);
    try {
      const vitales = await syncService.obtenerSignosVitalesIoT(visita.pacienteId);
      setSignosVitalesIot(vitales);
      if (Object.keys(vitales).length === 0) {
        Alert.alert("Sin lecturas", "No se encontraron lecturas de sensores para este paciente.");
      }
    } finally {
      setIsReadingSensor(false);
    }
  };

  // Traduce los campos de una plantilla al valor de sensor correspondiente.
  // Prioriza variableCodigo (plantillas reales, ligadas al catálogo de
  // variables clínicas); si no existe, usa alias conocidos por el código
  // local del campo (para las plantillas mock de demo/offline).
  const IOT_FIELD_ALIASES: Record<string, string> = {
    temperatura: 'temperatura',
    saturacion: 'saturacion_oxigeno',
    sat_pre: 'saturacion_oxigeno',
    sat_post: 'saturacion_oxigeno',
    pulso: 'frecuencia_cardiaca',
  };

  const resolverValorSensor = (campo: any, vitales: Record<string, number>): string | undefined => {
    if (campo.codigo === 'presion') {
      const sistolica = vitales['presion_arterial_sistolica'];
      const diastolica = vitales['presion_arterial_diastolica'];
      return sistolica != null && diastolica != null ? `${sistolica}/${diastolica}` : undefined;
    }
    const clave = campo.variableCodigo || IOT_FIELD_ALIASES[campo.codigo];
    const valor = clave ? vitales[clave] : undefined;
    return valor != null ? String(valor) : undefined;
  };

  // Auto-completa con los sensores IoT solo los campos que el profesional
  // todavía no llenó (no pisa lo que ya se escribió a mano).
  useEffect(() => {
    if (!selectedTemplateId || Object.keys(signosVitalesIot).length === 0) return;
    setFormData(prev => {
      let cambio = false;
      const next = { ...prev };
      for (const campo of currentTemplate.campos) {
        if (next[campo.codigo]) continue;
        const auto = resolverValorSensor(campo, signosVitalesIot);
        if (auto !== undefined) {
          next[campo.codigo] = auto;
          cambio = true;
        }
      }
      return cambio ? next : prev;
    });
  }, [selectedTemplateId, signosVitalesIot]);

  // Captura real de foto con expo-image-picker. El archivo local queda referenciado en
  // currentFotoUrl/currentFotoMimeType; la subida real al backend (POST
  // /documentos-adjuntos, con fichaClinicaId ya creado) ocurre recién en la
  // sincronización, no acá.
  const capturarConCamara = async () => {
    setIsUploadingPhoto(true);
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert("Permiso requerido", "Necesitas dar permiso de cámara para adjuntar una foto.");
        return;
      }
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.7,
      });
      if (!resultado.canceled && resultado.assets?.[0]) {
        const asset = resultado.assets[0];
        setCurrentFotoUrl(asset.uri);
        setCurrentFotoMimeType(asset.mimeType ?? 'image/jpeg');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const elegirDeGaleria = async () => {
    setIsUploadingPhoto(true);
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert("Permiso requerido", "Necesitas dar permiso de galería para adjuntar una foto.");
        return;
      }
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.7,
      });
      if (!resultado.canceled && resultado.assets?.[0]) {
        const asset = resultado.assets[0];
        setCurrentFotoUrl(asset.uri);
        setCurrentFotoMimeType(asset.mimeType ?? 'image/jpeg');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubirFoto = () => {
    Alert.alert(
      "Adjuntar fotografía",
      "¿Cómo quieres agregar la foto?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Elegir de galería", onPress: elegirDeGaleria },
        { text: "Tomar foto", onPress: capturarConCamara },
      ]
    );
  };

  const handleMandarFicha = () => {
    // 1. Validar campos obligatorios de la plantilla activa
    const camposIncompletos = currentTemplate.campos.filter((campo: any) => {
      return campo.obligatorio && (!formData[campo.codigo] || formData[campo.codigo].toString().trim() === "");
    });

    if (camposIncompletos.length > 0) {
      Alert.alert(
        "Campos Obligatorios",
        `Por favor completa los siguientes campos obligatorios:\n\n${camposIncompletos.map((c: any) => `• ${c.etiqueta}`).join("\n")}`,
        [{ text: "Entendido" }]
      );
      return;
    }

    // 2. Validar protocolo de seguridad
    const isProtocolIncomplete = listadoProtocolos.some((_, idx) => !protocolChecked[idx]);
    if (isProtocolIncomplete) {
      Alert.alert(
        "Protocolo Incompleto",
        "Debes verificar y marcar todos los pasos del protocolo de seguridad antes de mandar la ficha.",
        [{ text: "Entendido" }]
      );
      return;
    }

    // 3. Validar rangos numéricos
    for (const campo of currentTemplate.campos) {
      if (campo.tipo === "NUMERO_LIBRE") {
        const valStr = formData[campo.codigo];
        if (valStr) {
          const num = parseFloat(valStr);
          if (isNaN(num)) {
            Alert.alert("Error", `El valor en "${campo.etiqueta}" debe ser un número válido.`);
            return;
          }
          if (campo.codigo.includes("temp") && (num < 30 || num > 45)) {
            Alert.alert("Error", "La temperatura corporal debe estar entre 30°C y 45°C.");
            return;
          }
          if (campo.codigo.includes("sat") && (num < 50 || num > 100)) {
            Alert.alert("Error", "La saturación de oxígeno debe estar entre 50% y 100%.");
            return;
          }
        }
      }
    }

    // 4. Agregar o actualizar en el array
    setFichasCompletadas(prev => {
      const filtered = prev.filter(f => f.plantillaId !== currentTemplate.id);
      return [
        ...filtered,
        {
          plantillaId: currentTemplate.id,
          plantillaCodigo: currentTemplate.codigo,
          plantillaNombre: currentTemplate.nombre,
          contenido: formData,
          observaciones: observaciones,
          fotoUrl: currentFotoUrl,
          fotoMimeType: currentFotoMimeType,
        }
      ];
    });

    Alert.alert("Ficha Enviada", `Se han registrado/actualizado los datos de "${currentTemplate.nombre}" para esta consulta.`);
  };

  const handleAgregarMedicamento = () => {
    if (!medicamentoSeleccionado || cantidadCajas < 1) return;
    setMedicamentos(prev => [...prev, {
      medicamentoCatalogoId: medicamentoSeleccionado.id,
      nombre: medicamentoSeleccionado.nombre,
      cantidadCajas,
    }]);
    setMedicamentoSeleccionado(null);
    setCantidadCajas(1);
  };

  const handleQuitarMedicamento = (idx: number) => {
    setMedicamentos(prev => prev.filter((_, i) => i !== idx));
  };

  // Manejar el cambio de estado de la visita (Simulando GPS)
  // No hay GPS real (expo-location) todavía, pero la dirección como texto alcanza
  // para delegarle la navegación a Google Maps en vez de mostrar un mapa propio.
  const handleAbrirEnMaps = () => {
    const direccionTexto = `${visita.direccion.calle} ${visita.direccion.numero}, ${visita.direccion.comuna}`.trim();
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionTexto)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('No se pudo abrir Maps', 'Verifica que tengas una app de mapas instalada.');
    });
  };

  const handleIniciarRuta = async () => {
    setEstadoVisita("EN_CAMINO");
    onUpdateVisitaState(visita.id, "EN_CAMINO");
    // Encola el cambio de estado para el backend, que dispara la notificación al
    // paciente de "profesional en camino" (VisitasService.cambiarEstado).
    await onRegisterAttention('EN_CAMINO', visita.id, {});
  };

  const handleCheckIn = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCheckInTime(timeStr);
    setEstadoVisita("EN_ATENCION");
    onUpdateVisitaState(visita.id, "EN_ATENCION");

    // Registrar checkpoint CHECK_IN en la cola. No se envían coordenadas: la
    // geolocalización real (expo-location) todavía no está implementada en esta app,
    // y es preferible no mandar lat/long sin GPS real.
    await onRegisterAttention('CHECK_IN', visita.id, {});

    // Auto-completado de signos vitales: reclama el kit portátil de sensores
    // IoT (Proyecto 8) para este paciente y trae su última lectura. Best-effort
    // (obtenerSignosVitalesIoT nunca lanza), así que no bloquea el check-in si
    // el paciente no tiene sensores o el servicio externo falla.
    if (visita.pacienteId) {
      syncService.obtenerSignosVitalesIoT(visita.pacienteId).then(setSignosVitalesIot);
    }

    setActiveTab("CONSULTA"); // Llevar directo a la consulta tras el check-in
  };

  // Pre-Finalizar: ejecuta validaciones y abre modal de firma. El cierre de la
  // atención ahora se gatilla desde "Historial" (diagnóstico) y no depende de
  // haber llenado una ficha en "Consulta" (esa sigue siendo opcional).
  const handlePreFinalizar = () => {
    if (!diagnostico.trim()) {
      Alert.alert(
        "Falta el Diagnóstico",
        "Ingresa el diagnóstico del paciente en la pestaña 'Historial' antes de finalizar la atención.",
        [{ text: "Entendido" }]
      );
      return;
    }

    // Si todo es válido, abre el modal de firma de conformidad
    setShowSignatureModal(true);
  };

  // Guardado definitivo con la firma del cuidador/paciente
  const handleFinalizarConFirma = async () => {
    if (!signerName || !signerRut || !hasDrawnSignature) {
      Alert.alert(
        "Faltan Datos de Conformidad",
        "Por favor ingresa el Nombre, RUT y dibuja la firma digital del cuidador o paciente para certificar la atención.",
        [{ text: "Entendido" }]
      );
      return;
    }

    setShowSignatureModal(false);
    setIsLoading(true);

    try {
      // 1. Encolar Check-out (sin coordenadas; ver nota en handleCheckIn)
      await onRegisterAttention('CHECK_OUT', visita.id, {});

      // 2. Encolar cada una de las fichas completadas. backend-p1-salud solo
      // admite UNA ficha clínica por visita (ver ConflictException en
      // fichas-clinicas.service.ts): si se completó más de una plantilla, solo
      // la primera persiste y el resto choca con un 409 (limitación preexistente,
      // no introducida acá).
      for (const ficha of fichasCompletadas) {
        await onRegisterAttention('FICHA_CLINICA', visita.id, {
          plantillaFichaId: ficha.plantillaId,
          contenido: ficha.contenido,
          observaciones: ficha.observaciones,
          prestacionesRealizadas: [visita.prestacion],
          fotoLocalUri: ficha.fotoUrl,
          fotoMimeType: ficha.fotoMimeType,
          conformidad: {
            nombre: signerName,
            rut: signerRut,
            firma_token: "HASH_MOCK_SIGNATURE_" + Date.now(),
          }
        });
      }

      // 3. Encolar diagnóstico y medicamentos: viven en tablas propias
      // (diagnosticos, medicamentos), independientes de fichas_clinicas, así que
      // admiten múltiples registros por visita sin chocar con esa limitación.
      await onRegisterAttention('DIAGNOSTICO', visita.id, { descripcion: diagnostico });
      for (const medicamento of medicamentos) {
        await onRegisterAttention('MEDICAMENTO', visita.id, {
          medicamentoCatalogoId: medicamento.medicamentoCatalogoId,
          cantidadCajas: medicamento.cantidadCajas,
        });
      }

      // 3. Actualizar estado de visita a REALIZADA
      onUpdateVisitaState(visita.id, "REALIZADA", {
        check_out_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      setIsLoading(false);

      // No existe (todavía) un indicador real de "paciente frágil" en el backend, así
      // que en vez de auto-detectarlo se ofrece la solicitud de continuidad siempre,
      // como una opción manual del profesional.
      Alert.alert(
        "Atención Guardada",
        "La consulta ha sido registrada localmente y se sincronizará automáticamente al recuperar internet.\n\n¿Deseas solicitar una visita de seguimiento de continuidad para este paciente?",
        [
          { text: "No, gracias", onPress: onBack },
          {
            text: "Solicitar Seguimiento",
            onPress: () => {
              onScheduleFollowUp(visita);
              Alert.alert("Listo", "Solicitud de continuidad encolada; se enviará al coordinador al sincronizar.", [{ text: "Ok", onPress: onBack }]);
            }
          }
        ]
      );
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      Alert.alert("Error", "Hubo un fallo al registrar la atención en IndexedDB.");
    }
  };

  return (
    <VStack flex={1} bg={theme.colors.background}>

      {/* 1. Header con Botón Volver y Info General del Paciente */}
      <Box padding="md" bg={theme.colors.yaleBlue} style={styles.header}>
        <HStack align="center" gap="sm">
          <TouchableOpacity
            onPress={() => {
              if (estadoVisita === "EN_ATENCION") {
                Alert.alert(
                  "Consulta en curso",
                  "Debes finalizar la consulta y registrar el Check-Out para guardar todo y salir de la visita. Si sales ahora, perderás las fichas que no hayas enviado. ¿Deseas salir de todos modos?",
                  [
                    { text: "Permanecer en Consulta", style: "cancel" },
                    { text: "Salir sin guardar", style: "destructive", onPress: onBack }
                  ]
                );
              } else {
                onBack();
              }
            }}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <VStack flex={1}>
            <HStack align="center" gap="xs">
              <Label variant="h2" color={theme.colors.white}>
                {visita.paciente.nombres} {visita.paciente.apellidos}
              </Label>
            </HStack>
            <Label variant="caption" color="rgba(255,255,255,0.8)">
              {detallesClinicos.edad} • {detallesClinicos.sexo} • RUT: {detallesClinicos.rut}
            </Label>
          </VStack>
        </HStack>
      </Box>

      {/* 2. Barra de Pestañas (Tabs) de la Ficha */}
      <HStack style={styles.tabBar} bg={theme.colors.white}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'DOMICILIO' && styles.activeTabItem]}
          onPress={() => setActiveTab('DOMICILIO')}
        >
          <HStack align="center" gap="xs">
            <MapPin size={16} color={activeTab === 'DOMICILIO' ? theme.colors.yaleBlue : theme.colors.grayText} />
            <Label variant="caption" style={{ fontWeight: activeTab === 'DOMICILIO' ? 'bold' : 'normal' }} color={activeTab === 'DOMICILIO' ? theme.colors.yaleBlue : theme.colors.grayText}>
              Domicilio
            </Label>
          </HStack>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORIAL' && styles.activeTabItem]}
          onPress={() => setActiveTab('HISTORIAL')}
        >
          <HStack align="center" gap="xs">
            <ClipboardList size={16} color={activeTab === 'HISTORIAL' ? theme.colors.yaleBlue : theme.colors.grayText} />
            <Label variant="caption" style={{ fontWeight: activeTab === 'HISTORIAL' ? 'bold' : 'normal' }} color={activeTab === 'HISTORIAL' ? theme.colors.yaleBlue : theme.colors.grayText}>
              Diagnóstico
            </Label>
          </HStack>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'CONSULTA' && styles.activeTabItem]}
          onPress={() => setActiveTab('CONSULTA')}
        >
          <HStack align="center" gap="xs">
            <CheckSquare size={16} color={activeTab === 'CONSULTA' ? theme.colors.yaleBlue : theme.colors.grayText} />
            <Label variant="caption" style={{ fontWeight: activeTab === 'CONSULTA' ? 'bold' : 'normal' }} color={activeTab === 'CONSULTA' ? theme.colors.yaleBlue : theme.colors.grayText}>
              Consulta
            </Label>
          </HStack>
        </TouchableOpacity>
      </HStack>

      {/* 3. Contenedor de Vistas */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* TIPO A: VISTA DE DOMICILIO Y INDICACIONES */}
        {activeTab === 'DOMICILIO' && (
          <VStack gap="md">
            <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
              <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 8 }}>Dirección de Atención</Label>
              <Label variant="body" style={{ fontWeight: '500' }}>
                📍 {visita.direccion.calle} #{visita.direccion.numero}
              </Label>
              <Label variant="body" color={theme.colors.grayText} style={{ marginTop: 2 }}>
                Comuna: {visita.direccion.comuna}
              </Label>

              <View style={styles.separator} />

              <Label variant="caption" style={{ fontWeight: 'bold' }}>Referencia de Llegada:</Label>
              <Label variant="body" color={theme.colors.graphite} style={styles.textNote}>
                {detallesClinicos.referencia}
              </Label>

              <View style={styles.separator} />

              <Label variant="caption" style={{ fontWeight: 'bold' }}>Cuidador Responsable:</Label>
              <Label variant="body" color={theme.colors.graphite} style={styles.textNote}>
                {detallesClinicos.cuidador}
              </Label>
            </Box>

            {/* Geolocalización real (expo-location) todavía no está implementada; en su
                lugar, delega la navegación a Google Maps usando la dirección en texto. */}
            <TouchableOpacity onPress={handleAbrirEnMaps} activeOpacity={0.7}>
              <Box bg={theme.colors.white} radius="md" align="center" padding="lg" style={styles.mapMock}>
                <MapPin size={32} color={theme.colors.yaleBlue} />
                <Label variant="body" style={{ fontWeight: '600', marginTop: 8 }}>Abrir en Google Maps</Label>
                <Label variant="caption" color={theme.colors.grayText}>Toca para ver la ruta hacia esta dirección.</Label>
              </Box>
            </TouchableOpacity>

            {/* CONTROL DE ESTADOS DE RUTA Y CHECK-IN */}
            <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
              <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 12 }}>Flujo de Registro de Tiempos</Label>

              {estadoVisita === "PROGRAMADA" && (
                <SecondaryButton onPress={handleIniciarRuta}>
                  🚗 Iniciar Ruta hacia el Domicilio
                </SecondaryButton>
              )}

              {estadoVisita === "EN_CAMINO" && (
                <PrimaryButton onPress={handleCheckIn}>
                  🚪 Registrar Check-In (Llegada)
                </PrimaryButton>
              )}

              {estadoVisita === "EN_ATENCION" && (
                <VStack align="center" gap="sm">
                  <HStack gap="xs" align="center">
                    <Check size={18} color={theme.colors.success} />
                    <Label variant="body" color={theme.colors.success} style={{ fontWeight: 'bold' }}>
                      Check-In Registrado ({checkInTime || visita.hora})
                    </Label>
                  </HStack>
                  <PrimaryButton onPress={() => setActiveTab("CONSULTA")}>
                    ✏️ Ir a Registrar Consulta
                  </PrimaryButton>
                </VStack>
              )}

              {estadoVisita === "REALIZADA" && (
                <Box align="center" padding="sm">
                  <Label variant="body" color={theme.colors.success} style={{ fontWeight: 'bold' }}>
                    ✓ Esta atención ya fue realizada con éxito
                  </Label>
                </Box>
              )}
            </Box>
          </VStack>
        )}

        {/* TIPO B: Plan de Cuidados, Botones de Medicamentos e Historial Clínico */}
        {activeTab === 'HISTORIAL' && (
          <VStack gap="md">

            {/* ACCESO RÁPIDO A ALERGIAS (solo lectura; sin respaldo real en el backend) */}
            <HStack gap="sm" width="100%">
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBadgeButton, { backgroundColor: '#FDF2E9', borderColor: '#F5C6A5' }]}
                onPress={() => setShowAllergiesModal(true)}
              >
                <Label variant="caption" color="#D9381E" style={{ fontWeight: 'bold', fontSize: 13 }}>
                  🚫 Alergias Médicas
                </Label>
              </TouchableOpacity>
            </HStack>

            {/* Diagnóstico y Medicamentos: se registran acá (no en "Consulta") y
                viajan dentro del contenido jsonb de la única ficha clínica que
                admite backend-p1-salud por visita. */}
            <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
              <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 8 }}>Diagnóstico y Medicamentos</Label>

              <Label variant="caption" style={styles.inputLabel}>Diagnóstico {estadoVisita === "EN_ATENCION" ? '*' : ''}</Label>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="Ej: Hipertensión arterial descompensada"
                value={diagnostico}
                onChangeText={setDiagnostico}
                placeholderTextColor={theme.colors.grayText}
                editable={estadoVisita === "EN_ATENCION"}
              />

              <View style={styles.separator} />

              <Label variant="caption" style={styles.inputLabel}>💊 Medicamentos</Label>

              {medicamentos.length === 0 ? (
                <Label variant="body" color={theme.colors.grayText} style={{ marginBottom: 8 }}>
                  No hay medicamentos registrados para esta atención.
                </Label>
              ) : (
                <VStack gap="xs" style={{ marginBottom: 8 }}>
                  {medicamentos.map((med, idx) => (
                    <HStack key={idx} justify="space-between" align="center" bg="#EBF3F6" padding="sm" radius="sm">
                      <Label variant="body" color={theme.colors.yaleBlue} style={{ flex: 1, fontWeight: '500' }}>
                        • {med.nombre} — {med.cantidadCajas} caja{med.cantidadCajas === 1 ? '' : 's'}
                      </Label>
                      {estadoVisita === "EN_ATENCION" && (
                        <TouchableOpacity onPress={() => handleQuitarMedicamento(idx)} activeOpacity={0.7}>
                          <Label variant="body" color={theme.colors.danger} style={{ fontWeight: 'bold', paddingHorizontal: 8 }}>
                            ✕
                          </Label>
                        </TouchableOpacity>
                      )}
                    </HStack>
                  ))}
                </VStack>
              )}

              {estadoVisita === "EN_ATENCION" && (
                <VStack gap="sm">
                  <TouchableOpacity
                    style={styles.medSelectorBox}
                    onPress={() => setShowMedicamentoPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Label
                      variant="body"
                      color={medicamentoSeleccionado ? theme.colors.graphite : theme.colors.grayText}
                      style={{ flex: 1 }}
                    >
                      {medicamentoSeleccionado
                        ? `${medicamentoSeleccionado.nombre}${medicamentoSeleccionado.presentacion ? ` (${medicamentoSeleccionado.presentacion})` : ''}`
                        : 'Toca para elegir un medicamento del catálogo'}
                    </Label>
                    <Label variant="body" color={theme.colors.grayText}>▾</Label>
                  </TouchableOpacity>

                  <HStack gap="sm" align="center" justify="space-between">
                    <HStack gap="sm" align="center">
                      <Label variant="caption" style={{ fontWeight: '600', color: theme.colors.graphite }}>
                        Cantidad de cajas:
                      </Label>
                      <TouchableOpacity
                        style={styles.stepperButton}
                        onPress={() => setCantidadCajas(c => Math.max(1, c - 1))}
                        activeOpacity={0.7}
                      >
                        <Label variant="body" color={theme.colors.yaleBlue} style={{ fontWeight: 'bold' }}>−</Label>
                      </TouchableOpacity>
                      <Label variant="body" style={{ fontWeight: 'bold', minWidth: 24, textAlign: 'center' }}>
                        {cantidadCajas}
                      </Label>
                      <TouchableOpacity
                        style={styles.stepperButton}
                        onPress={() => setCantidadCajas(c => c + 1)}
                        activeOpacity={0.7}
                      >
                        <Label variant="body" color={theme.colors.yaleBlue} style={{ fontWeight: 'bold' }}>+</Label>
                      </TouchableOpacity>
                    </HStack>

                    <TouchableOpacity
                      style={[styles.addMedButton, !medicamentoSeleccionado && { opacity: 0.5 }]}
                      onPress={handleAgregarMedicamento}
                      disabled={!medicamentoSeleccionado}
                      activeOpacity={0.7}
                    >
                      <Label variant="body" color={theme.colors.white} style={{ fontWeight: 'bold' }}>
                        + Agregar
                      </Label>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              )}
            </Box>

            {/* Botón de Cierre General de Consulta: vive acá y no en "Consulta". */}
            {estadoVisita === "EN_ATENCION" && (
              <PrimaryButton
                isLoading={isLoading}
                onPress={handlePreFinalizar}
                style={{ height: 46 }}
              >
                🏁 Finalizar Consulta y Registrar Check-Out
              </PrimaryButton>
            )}

            {/* Plan de Cuidado Longitudinal */}
            <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
              <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 8 }}>Plan de Cuidado Activo</Label>
              <Label variant="caption" style={{ fontWeight: 'bold' }}>Objetivo:</Label>
              <Label variant="body" style={styles.textNote}>{detallesClinicos.plan_cuidado.objetivo}</Label>

              {!!detallesClinicos.plan_cuidado.descripcion && (
                <>
                  <View style={styles.separator} />
                  <Label variant="caption" style={{ fontWeight: 'bold' }}>Descripción:</Label>
                  <Label variant="body" style={styles.textNote}>{detallesClinicos.plan_cuidado.descripcion}</Label>
                </>
              )}

              <View style={styles.separator} />

              <Label variant="caption" style={{ fontWeight: 'bold' }}>Estado:</Label>
              <Label variant="body" style={styles.textNote}>{detallesClinicos.plan_cuidado.estado}</Label>
            </Box>

            {/* Historial de Mediciones Clínicas */}
            <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
              <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 12 }}>Historial de Mediciones</Label>

              {detallesClinicos.historial.length === 0 ? (
                <Label variant="body" color={theme.colors.grayText}>No hay mediciones registradas para este paciente.</Label>
              ) : detallesClinicos.historial.map((h: any, idx: number) => (
                <VStack key={idx} style={styles.historyItem}>
                  <HStack justify="space-between" align="center">
                    <Label variant="caption" style={{ fontWeight: 'bold' }} color={theme.colors.yaleBlue}>
                      {new Date(h.fecha).toLocaleString()}
                    </Label>
                    <Label variant="caption" color={theme.colors.grayText}>
                      {h.variable}
                    </Label>
                  </HStack>
                  <Label variant="body" color={theme.colors.graphite} style={{ marginTop: 4 }}>
                    {h.valor}
                  </Label>
                  {idx < detallesClinicos.historial.length - 1 && <View style={styles.historyDivider} />}
                </VStack>
              ))}
            </Box>
          </VStack>
        )}

        {/* TIPO C: FORMULARIO DINÁMICO DE REGISTRO DE CONSULTA */}
        {activeTab === 'CONSULTA' && (
          <VStack gap="md">
            {estadoVisita !== "EN_ATENCION" && estadoVisita !== "REALIZADA" ? (
              <Box bg={theme.colors.white} radius="md" padding="xl" align="center" style={styles.cardInfo}>
                <Label variant="body" color={theme.colors.danger} style={{ fontWeight: 'bold', textAlign: 'center' }}>
                  Atención No Iniciada
                </Label>
                <Label variant="caption" style={{ textAlign: 'center', marginTop: 8 }}>
                  Debes registrar el Check-In en la pestaña de "Domicilio" antes de poder capturar los datos de la consulta clínica.
                </Label>
                <OutlineButton style={{ marginTop: 16 }} onPress={() => setActiveTab("DOMICILIO")}>
                  Ir a Domicilio y Marcar Check-In
                </OutlineButton>
              </Box>
            ) : (
              <VStack gap="md">

                {/* SELECTOR DE PLANTILLAS DINÁMICAS */}
                <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
                  <VStack gap="sm">
                    <Label variant="caption" style={{ fontWeight: '700', color: theme.colors.yaleBlue }}>
                      📋 Seleccionar Tipo de Formulario Clínico
                    </Label>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
                      {templatesList.map((p) => {
                        const isSelected = selectedTemplateId === p.id;
                        const isCompleted = fichasCompletadas.some(f => f.plantillaId === p.id);
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.templateBadge,
                              isSelected ? styles.templateBadgeActive : null,
                              isCompleted && !isSelected ? { borderColor: theme.colors.success } : null
                            ]}
                            disabled={estadoVisita === "REALIZADA"}
                            onPress={() => {
                              setSelectedTemplateId(p.id);
                            }}
                          >
                            <Label variant="caption" color={isSelected ? theme.colors.white : theme.colors.graphite} style={{ fontWeight: '600' }}>
                              {isCompleted ? "✓ " : ""}{p.nombre}
                            </Label>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </VStack>
                </Box>

                {/* 🔒 CHECKLIST DE SEGURIDAD CLÍNICA (NUEVO REQUERIMIENTO - GOBERNANZA) */}
                <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
                  <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 4 }}>
                    🔒 Protocolo Clínico Obligatorio
                  </Label>
                  <Label variant="caption" style={{ marginBottom: 10 }}>
                    Marca los pasos ejecutados. Bloquea el guardado si no se cumplen.
                  </Label>

                  <VStack gap="sm">
                    {listadoProtocolos.map((paso, idx) => {
                      const isChecked = !!protocolChecked[idx];
                      return (
                        <HStack key={idx} align="center" gap="sm" style={styles.protocolRow}>
                          <Switch
                            value={isChecked}
                            disabled={estadoVisita === "REALIZADA"}
                            onValueChange={(val) => setProtocolChecked(prev => ({ ...prev, [idx]: val }))}
                            trackColor={{ false: theme.colors.alabasterGrey, true: theme.colors.success }}
                            thumbColor={theme.colors.white}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                          />
                          <Label variant="body" style={{ flex: 1, fontSize: 14, color: theme.colors.graphite }}>
                            {paso}
                          </Label>
                        </HStack>
                      );
                    })}
                  </VStack>
                </Box>

                {/* CONSTRUCTOR DE FORMULARIO DINÁMICO */}
                <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>

                  {/* BOTÓN CAPTURA DE SENSORES (PROYECTO 8) */}
                  {tieneCamposDeSensor && estadoVisita !== "REALIZADA" && (
                    <VStack gap="xs" style={{ marginBottom: 16 }}>
                      <SecondaryButton
                        isLoading={isReadingSensor}
                        style={{ backgroundColor: theme.colors.stormyTeal }}
                        textColor={theme.colors.white}
                        onPress={handleLeerSensores}
                      >
                        📡 Actualizar desde Sensores (Proyecto 8)
                      </SecondaryButton>
                      {Object.keys(signosVitalesIot).length > 0 && (
                        <Label variant="caption" color={theme.colors.success}>
                          📡 Signos vitales auto-completados desde el sensor. Puedes editarlos si es necesario.
                        </Label>
                      )}
                    </VStack>
                  )}

                  <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 12 }}>
                    Datos del Formulario: {currentTemplate.nombre}
                  </Label>

                  <VStack gap="md">
                    {currentTemplate.campos.map((campo: any) => {
                      const value = formData[campo.codigo] || "";

                      const handleValueChange = (val: any) => {
                        setFormData(prev => ({ ...prev, [campo.codigo]: val }));
                      };

                      if (campo.tipo === "TEXTO_LIBRE") {
                        return (
                          <FormInput
                            key={campo.codigo}
                            label={`${campo.etiqueta}${campo.obligatorio ? ' *' : ''}`}
                            value={value}
                            onChangeText={handleValueChange}
                            placeholder={campo.placeholder}
                            editable={estadoVisita !== "REALIZADA"}
                          />
                        );
                      }

                      if (campo.tipo === "NUMERO_LIBRE") {
                        return (
                          <FormInput
                            key={campo.codigo}
                            label={`${campo.etiqueta}${campo.obligatorio ? ' *' : ''}`}
                            value={value}
                            onChangeText={handleValueChange}
                            placeholder={campo.placeholder}
                            keyboardType="numeric"
                            editable={estadoVisita !== "REALIZADA"}
                          />
                        );
                      }

                      if (campo.tipo === "BOOLEANO") {
                        const isTrue = value === true;
                        return (
                          <HStack key={campo.codigo} justify="space-between" align="center" style={styles.switchRow} bg={theme.colors.white} padding="sm" radius="sm">
                            <Label variant="body">{campo.etiqueta}</Label>
                            <Switch
                              value={isTrue}
                              onValueChange={handleValueChange}
                              disabled={estadoVisita === "REALIZADA"}
                              trackColor={{ false: theme.colors.alabasterGrey, true: theme.colors.success }}
                              thumbColor={theme.colors.white}
                            />
                          </HStack>
                        );
                      }

                      if (campo.tipo === "SELECT") {
                        return (
                          <VStack key={campo.codigo} gap="xs">
                            <Label variant="caption" style={{ fontWeight: '600' }}>
                              {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
                            </Label>
                            <HStack gap="xs" style={{ flexWrap: 'wrap' }}>
                              {campo.opciones?.map((opcion: any) => {
                                const isOptionSelected = value === opcion;
                                return (
                                  <TouchableOpacity
                                    key={opcion}
                                    style={[
                                      styles.optionBadge,
                                      isOptionSelected ? styles.optionBadgeActive : null
                                    ]}
                                    onPress={() => estadoVisita !== "REALIZADA" && handleValueChange(opcion)}
                                  >
                                    <Label variant="caption" color={isOptionSelected ? theme.colors.white : theme.colors.graphite} style={{ fontWeight: '500' }}>
                                      {opcion}
                                    </Label>
                                  </TouchableOpacity>
                                );
                              })}
                            </HStack>
                          </VStack>
                        );
                      }

                      return null;
                    })}
                  </VStack>
                </Box>

                {/* Prestaciones Clínicas del Itinerario */}
                <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
                  <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 12 }}>Procedimiento Programado</Label>
                  <HStack justify="space-between" align="center" style={styles.checkboxRow}>
                    <VStack flex={1} style={{ paddingRight: 8 }}>
                      <Label variant="body" style={{ fontWeight: '500' }}>
                        {visita.prestacion}
                      </Label>
                      <Label variant="caption" color={theme.colors.grayText}>
                        Procedimiento asignado en la agenda semanal de coordinación.
                      </Label>
                    </VStack>
                    <Switch
                      value={prestacionCompletada}
                      onValueChange={setPrestacionCompletada}
                      disabled={estadoVisita === "REALIZADA"}
                      trackColor={{ false: theme.colors.alabasterGrey, true: theme.colors.success }}
                      thumbColor={theme.colors.white}
                    />
                  </HStack>
                </Box>

                {/* Observaciones y Fotos */}
                <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
                  <Label variant="h2" color={theme.colors.yaleBlue} style={{ marginBottom: 12 }}>Observaciones y Adjuntos</Label>

                  <Label variant="caption" style={styles.inputLabel}>Evolución Clínica / Notas Generales</Label>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="Escribe indicaciones especiales o notas sobre la respuesta del paciente..."
                    value={observaciones}
                    onChangeText={setObservaciones}
                    placeholderTextColor={theme.colors.grayText}
                    editable={estadoVisita !== "REALIZADA"}
                  />

                  <View style={styles.separator} />

                  <HStack justify="space-between" align="center" width="100%">
                    <VStack style={{ flex: 1, paddingRight: 8 }}>
                      <Label variant="body" style={{ fontWeight: '500' }}>Adjuntar Fotografía</Label>
                      <Label variant="caption" color={theme.colors.grayText} numberOfLines={1}>
                        {currentFotoUrl ? `✓ Foto subida: ...${currentFotoUrl.substring(currentFotoUrl.lastIndexOf('/'))}` : "Opcional: heridas, recetas..."}
                      </Label>
                    </VStack>

                    <TouchableOpacity
                      style={[styles.cameraButton, currentFotoUrl && styles.cameraButtonActive]}
                      onPress={() => estadoVisita !== "REALIZADA" && handleSubirFoto()}
                      disabled={isUploadingPhoto || estadoVisita === "REALIZADA"}
                      activeOpacity={0.7}
                    >
                      {isUploadingPhoto ? (
                        <ActivityIndicator size="small" color={theme.colors.yaleBlue} />
                      ) : (
                        <Camera size={20} color={currentFotoUrl ? theme.colors.success : theme.colors.grayText} />
                      )}
                    </TouchableOpacity>
                  </HStack>
                </Box>

                {/* LISTADO DE FICHAS COMPLETADAS Y ENVIADAS EN ESTA ATENCION */}
                {fichasCompletadas.length > 0 && (
                  <Box bg={theme.colors.white} radius="md" padding="md" style={styles.cardInfo}>
                    <Label variant="h2" color={theme.colors.success} style={{ marginBottom: 8 }}>
                      📋 Fichas Registradas en esta Consulta ({fichasCompletadas.length})
                    </Label>
                    <VStack gap="sm">
                      {fichasCompletadas.map((ficha) => (
                        <HStack key={ficha.plantillaId} justify="space-between" align="center" style={styles.completedFichaRow}>
                          <VStack style={{ flex: 1, paddingRight: 8 }}>
                            <Label variant="body" style={{ fontWeight: '600', color: theme.colors.graphite }}>
                              ✓ {ficha.plantillaNombre}
                            </Label>
                            <Label variant="caption" color={theme.colors.grayText}>
                              {Object.keys(ficha.contenido || {}).length} campos registrados
                              {ficha.fotoUrl ? ' • Posee fotografía' : ''}
                            </Label>
                          </VStack>
                          {estadoVisita !== "REALIZADA" && (
                            <TouchableOpacity
                              style={styles.editFichaButton}
                              onPress={() => {
                                setSelectedTemplateId(ficha.plantillaId);
                                Alert.alert("Cargar Ficha", `Datos de "${ficha.plantillaNombre}" cargados en el formulario para edición.`);
                              }}
                            >
                              <Label variant="caption" color={theme.colors.yaleBlue} style={{ fontWeight: 'bold' }}>
                                Editar Datos
                              </Label>
                            </TouchableOpacity>
                          )}
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Botón de Guardado Individual de Ficha. El cierre de la consulta
                    (Check-Out) ahora vive en la pestaña "Historial", junto al
                    diagnóstico y los medicamentos. */}
                {estadoVisita === "EN_ATENCION" && (
                  <SecondaryButton
                    onPress={handleMandarFicha}
                    style={{ backgroundColor: theme.colors.success, borderColor: theme.colors.success, height: 46 }}
                  >
                    <Label variant="caption" color={theme.colors.white} style={{ fontWeight: 'bold' }}>
                      💾 Mandar Ficha a esta Consulta ({currentTemplate.nombre})
                    </Label>
                  </SecondaryButton>
                )}
              </VStack>
            )}
          </VStack>
        )}
      </ScrollView>

      {/* MODAL 1: MEDICAMENTOS ALÉRGICOS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAllergiesModal}
        onRequestClose={() => setShowAllergiesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Box bg={theme.colors.white} radius="lg" padding="lg" style={styles.modalContent}>
            <VStack gap="md">
              <Label variant="h2" color={theme.colors.danger}>🚫 Medicamentos Alérgicos</Label>
              <Label variant="caption">Sustancias a las que el paciente reacciona desfavorablemente.</Label>

              <VStack gap="xs" style={{ marginTop: 8 }}>
                {historialFarmacologico.alergias.map((item, idx) => (
                  <Box key={idx} bg="#FDF2E9" padding="sm" radius="sm">
                    <Label variant="body" color="#D9381E" style={{ fontWeight: '600' }}>
                      • {item}
                    </Label>
                  </Box>
                ))}
              </VStack>

              <PrimaryButton
                style={{ backgroundColor: theme.colors.danger, marginTop: 12 }}
                onPress={() => setShowAllergiesModal(false)}
              >
                Cerrar Ventana
              </PrimaryButton>
            </VStack>
          </Box>
        </View>
      </Modal>

      {/* MODAL 2: SELECTOR DE MEDICAMENTO (COMBOBOX DEL CATÁLOGO) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMedicamentoPicker}
        onRequestClose={() => setShowMedicamentoPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <Box bg={theme.colors.white} radius="lg" padding="lg" style={styles.modalContent}>
            <VStack gap="md">
              <Label variant="h2" color={theme.colors.yaleBlue}>💊 Elegir Medicamento</Label>
              {catalogoMedicamentosList.length === 0 && (
                <Label variant="body" color={theme.colors.grayText}>
                  No hay medicamentos disponibles todavía. Sincroniza la app (pestaña Itinerario) para descargar el catálogo.
                </Label>
              )}
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                <VStack gap="xs">
                  {catalogoMedicamentosList.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.medPickerRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        setMedicamentoSeleccionado(item);
                        setShowMedicamentoPicker(false);
                      }}
                    >
                      <Label variant="body" style={{ fontWeight: '600', color: theme.colors.graphite }}>
                        {item.nombre}
                      </Label>
                      {!!item.presentacion && (
                        <Label variant="caption" color={theme.colors.grayText}>
                          {item.presentacion}
                        </Label>
                      )}
                    </TouchableOpacity>
                  ))}
                </VStack>
              </ScrollView>

              <OutlineButton onPress={() => setShowMedicamentoPicker(false)}>
                Cancelar
              </OutlineButton>
            </VStack>
          </Box>
        </View>
      </Modal>

      {/* ✍️ MODAL 3: FIRMA DIGITAL DE CONFORMIDAD (NUEVO REQUERIMIENTO) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSignatureModal}
        onRequestClose={() => setShowSignatureModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Box bg={theme.colors.white} radius="lg" padding="lg" style={[styles.modalContent, { maxWidth: 360 }]}>
            <VStack gap="md">
              <Label variant="h2" color={theme.colors.yaleBlue}>✍️ Firma de Conformidad</Label>
              <Label variant="caption">
                Registra la identidad y la firma de conformidad del paciente o cuidador a cargo para finalizar el servicio.
              </Label>

              <VStack gap="sm" style={{ marginTop: 4 }}>
                <FormInput
                  label="Nombre del Receptor / Cuidador"
                  value={signerName}
                  onChangeText={setSignerName}
                  placeholder="Ej: María Gómez"
                />

                <FormInput
                  label="RUT del Firmante"
                  value={signerRut}
                  onChangeText={setSignerRut}
                  placeholder="Ej: 12.345.678-k"
                />

                {/* Lienzo de Firma Táctil Simulado */}
                <VStack gap="xs">
                  <Label variant="caption" style={{ fontWeight: '600' }}>Firma en Pantalla (Táctil)</Label>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.signaturePad, hasDrawnSignature && styles.signaturePadActive]}
                    onPress={() => setHasDrawnSignature(!hasDrawnSignature)}
                  >
                    {hasDrawnSignature ? (
                      <HStack align="center" gap="xs">
                        <Check size={20} color={theme.colors.success} />
                        <Label variant="body" color={theme.colors.success} style={{ fontWeight: '600' }}>
                          Firma Táctil Capturada
                        </Label>
                      </HStack>
                    ) : (
                      <VStack align="center" gap="xs">
                        <PenTool size={24} color={theme.colors.grayText} />
                        <Label variant="caption" color={theme.colors.grayText}>
                          Toca aquí para simular firma con el dedo
                        </Label>
                      </VStack>
                    )}
                  </TouchableOpacity>
                </VStack>
              </VStack>

              <HStack gap="sm" style={{ marginTop: 12 }}>
                <OutlineButton
                  style={{ flex: 1 }}
                  onPress={() => setShowSignatureModal(false)}
                >
                  Volver
                </OutlineButton>

                <PrimaryButton
                  style={{ flex: 1.5 }}
                  onPress={handleFinalizarConFirma}
                  disabled={!signerName || !signerRut || !hasDrawnSignature}
                >
                  Confirmar
                </PrimaryButton>
              </HStack>
            </VStack>
          </Box>
        </View>
      </Modal>

    </VStack>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.alabasterGrey,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: theme.colors.yaleBlue,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  cardInfo: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: theme.spacing.sm,
  },
  textNote: {
    marginTop: 4,
    color: theme.colors.graphite,
  },
  mapMock: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderStyle: 'dashed',
  },
  historyItem: {
    paddingVertical: theme.spacing.xs,
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#F7F7F7',
    marginVertical: theme.spacing.sm,
  },
  inputLabel: {
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
    color: theme.colors.graphite,
  },
  textArea: {
    width: '100%',
    minHeight: 80,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.graphite,
    backgroundColor: theme.colors.white,
    textAlignVertical: 'top',
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
  },
  cameraButtonActive: {
    borderColor: theme.colors.success,
    backgroundColor: '#EAF6F3',
  },
  checkboxRow: {
    paddingVertical: theme.spacing.xs,
  },
  actionBadgeButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  addMedButton: {
    height: 44,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.yaleBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
  },
  medPickerRow: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
  },
  templateScroll: {
    gap: 8,
    paddingVertical: theme.spacing.xs,
  },
  templateBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    backgroundColor: theme.colors.white,
  },
  templateBadgeActive: {
    backgroundColor: theme.colors.stormyTeal,
    borderColor: theme.colors.stormyTeal,
  },
  optionBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    backgroundColor: '#F5F5F5',
    marginRight: 6,
    marginBottom: 6,
  },
  optionBadgeActive: {
    backgroundColor: theme.colors.yaleBlue,
    borderColor: theme.colors.yaleBlue,
  },
  switchRow: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  protocolRow: {
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F7',
  },
  signaturePad: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    borderRadius: theme.radius.md,
    borderStyle: 'dashed',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signaturePadActive: {
    borderColor: theme.colors.success,
    backgroundColor: '#EAF6F3',
    borderStyle: 'solid',
  },
  completedFichaRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  editFichaButton: {
    backgroundColor: '#EBF3F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: '#BCE3EB',
  },
});

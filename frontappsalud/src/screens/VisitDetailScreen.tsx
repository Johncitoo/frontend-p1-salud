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

// Alergias y medicación actual: backend-p1-salud no tiene ninguna entidad para esto
// todavía (ni endpoint ni columna en Paciente), así que no hay dato real que mostrar.
// En vez de fabricar contenido por paciente, se muestra siempre este aviso honesto.
const SIN_DATOS_ALERGIAS_MEDICACION = {
  alergias: ["Sin datos disponibles: el backend aún no registra alergias por paciente."],
  actuales: ["Sin datos disponibles: el backend aún no registra medicación por paciente."],
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
  onBack: () => void;
  onUpdateVisitaState: (visitaId: string, nuevoEstado: string, datosConsulta?: any) => void;
  onRegisterAttention: (tipo: 'CHECK_IN' | 'CHECK_OUT' | 'FICHA_CLINICA', visitaId: string, data: any) => Promise<void>;
  onScheduleFollowUp: (visitaBase: any) => void;
}

export default function VisitDetailScreen({ visita, plantillas, onBack, onUpdateVisitaState, onRegisterAttention, onScheduleFollowUp }: VisitDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<'DOMICILIO' | 'HISTORIAL' | 'CONSULTA'>('DOMICILIO');
  const [estadoVisita, setEstadoVisita] = useState(visita.estado);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // Control de Modales de Alergias, Medicación y Firma
  const [showAllergiesModal, setShowAllergiesModal] = useState(false);
  const [showMedsModal, setShowMedsModal] = useState(false);
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

  // Checklist de protocolos clínicos
  const [protocolChecked, setProtocolChecked] = useState<Record<number, boolean>>({});

  // Checklist de prestaciones y fotos
  const [prestacionCompletada, setPrestacionCompletada] = useState(false);
  const [currentFotoUrl, setCurrentFotoUrl] = useState<string | null>(null);
  const [currentFotoMimeType, setCurrentFotoMimeType] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingSensor, setIsReadingSensor] = useState(false);

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

  // Alergias y medicación actual: sin respaldo en el backend todavía (ver constante arriba).
  const historialFarmacologico = SIN_DATOS_ALERGIAS_MEDICACION;

  // Llamar al endpoint del sensor del Proyecto 8 (Consumo de API Real + Mocks de contingencia)
  const handleLeerSensores = async () => {
    setIsReadingSensor(true);
    try {
      const response = await fetch(`https://api-proyecto8-sensores.com/api/sensado?rut=${detallesClinicos.rut}`);
      if (!response.ok) throw new Error("Fallo de conexión");
      const sensorData = await response.json();

      setFormData(prev => ({
        ...prev,
        temperatura: sensorData.temperatura ? sensorData.temperatura.toString() : prev.temperatura,
        saturacion: sensorData.saturacion ? sensorData.saturacion.toString() : prev.saturacion,
        pulso: sensorData.pulso ? sensorData.pulso.toString() : prev.pulso,
        sat_pre: sensorData.saturacion ? sensorData.saturacion.toString() : prev.sat_pre,
      }));

      Alert.alert("Sensor Conectado", "Los signos vitales han sido capturados con éxito del endpoint del Proyecto 8.");
    } catch (error) {
      // Mock de error interactivo en el Frontend (Requisito de Testing para Mocks de contingencia)
      Alert.alert(
        "Error de Dispositivo / Sin Conexión",
        "No se pudo conectar al endpoint del sensor. ¿Deseas simular una respuesta de pruebas?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Simular Lectura Normal (OK)",
            onPress: () => {
              setFormData(prev => ({
                ...prev,
                presion: "120/80",
                temperatura: "36.6",
                saturacion: "98",
                pulso: "72",
                sat_pre: "95"
              }));
              Alert.alert("Lectura Simulada", "Signos vitales cargados con éxito (Paciente Estable).");
            }
          },
          {
            text: "Simular Alerta Crítica (Fuera de Rango)",
            onPress: () => {
              setFormData(prev => ({
                ...prev,
                presion: "145/95",
                temperatura: "39.2",
                saturacion: "87", // Hipoxia
                pulso: "115", // Taquicardia
                sat_pre: "87"
              }));
              Alert.alert(
                "⚠️ ALERTA DE RIESGO CLÍNICO",
                "Signos vitales fuera de límites aceptables: Fiebre Alta (39.2°C) e Hipoxia severa (87%). Reporte de inmediato.",
                [{ text: "Entendido" }]
              );
            }
          }
        ]
      );
    } finally {
      setIsReadingSensor(false);
    }
  };

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

  const handleIniciarRuta = () => {
    setEstadoVisita("EN_CAMINO");
    onUpdateVisitaState(visita.id, "EN_CAMINO");
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

    setActiveTab("CONSULTA"); // Llevar directo a la consulta tras el check-in
  };

  // Pre-Finalizar: ejecuta validaciones y abre modal de firma
  const handlePreFinalizar = () => {
    if (fichasCompletadas.length === 0) {
      Alert.alert(
        "Faltan Fichas Clínicas",
        "Por favor completa y guarda al menos una ficha (presionando el botón '💾 Guardar esta Ficha') antes de finalizar la atención general.",
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

      // 2. Encolar cada una de las fichas completadas
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
              Historial
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

            {/* ACCESO RÁPIDO A MEDICACIÓN Y ALERGIAS */}
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

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBadgeButton, { backgroundColor: '#EBF3F6', borderColor: '#BCE3EB' }]}
                onPress={() => setShowMedsModal(true)}
              >
                <Label variant="caption" color={theme.colors.yaleBlue} style={{ fontWeight: 'bold', fontSize: 13 }}>
                  💊 Medicación Actual
                </Label>
              </TouchableOpacity>
            </HStack>

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
                  {(selectedTemplateId === "p1" || selectedTemplateId === "p3") && estadoVisita !== "REALIZADA" && (
                    <SecondaryButton
                      isLoading={isReadingSensor}
                      style={{ marginBottom: 16, backgroundColor: theme.colors.stormyTeal }}
                      onPress={handleLeerSensores}
                    >
                      🔌 Capturar desde Sensor (Proyecto 8)
                    </SecondaryButton>
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

                {/* Botones de Guardado y Cierre */}
                {estadoVisita === "EN_ATENCION" && (
                  <VStack gap="xs" style={{ paddingVertical: 8 }}>
                    {/* Botón de Guardado Individual de Ficha */}
                    <SecondaryButton
                      onPress={handleMandarFicha}
                      style={{ backgroundColor: theme.colors.success, borderColor: theme.colors.success, height: 46 }}
                    >
                      <Label variant="caption" color={theme.colors.white} style={{ fontWeight: 'bold' }}>
                        💾 Mandar Ficha a esta Consulta ({currentTemplate.nombre})
                      </Label>
                    </SecondaryButton>

                    {/* Botón de Cierre General de Consulta */}
                    <PrimaryButton
                      isLoading={isLoading}
                      onPress={handlePreFinalizar}
                      style={{ height: 46, marginTop: 4 }}
                    >
                      🏁 Finalizar Consulta y Registrar Check-Out
                    </PrimaryButton>
                  </VStack>
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

      {/* MODAL 2: MEDICACIÓN ACTUAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMedsModal}
        onRequestClose={() => setShowMedsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Box bg={theme.colors.white} radius="lg" padding="lg" style={styles.modalContent}>
            <VStack gap="md">
              <Label variant="h2" color={theme.colors.yaleBlue}>💊 Medicación Actual</Label>
              <Label variant="caption">Lista de fármacos que el paciente toma actualmente de forma regular.</Label>

              <ScrollView style={{ maxHeight: 200, marginTop: 8 }}>
                <VStack gap="xs">
                  {historialFarmacologico.actuales.map((item, idx) => (
                    <Box key={idx} bg="#EBF3F6" padding="sm" radius="sm">
                      <Label variant="body" color={theme.colors.yaleBlue} style={{ fontWeight: '500' }}>
                        • {item}
                      </Label>
                    </Box>
                  ))}
                </VStack>
              </ScrollView>

              <PrimaryButton
                style={{ marginTop: 12 }}
                onPress={() => setShowMedsModal(false)}
              >
                Cerrar Ventana
              </PrimaryButton>
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

import React, { useState, useEffect } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from './src/theme';
import { Box, HStack, VStack } from './src/components/Layout';
import { Label } from './src/components/Label';
import LoginScreen from './src/screens/LoginScreen';
import ItineraryScreen from './src/screens/ItineraryScreen';
import VisitDetailScreen from './src/screens/VisitDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { db } from './src/database/offlineDb';
import { hydrateFromSnapshot } from './src/database/offlineDbPersistence';
import { Calendar, Settings } from 'lucide-react-native';

import { syncService, AUTH_MODE } from './src/services/syncService';
import { restoreSession, hasKeycloakAccessRole, logoutFromKeycloak } from './src/services/keycloakAuth';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<'LOGIN' | 'ITINERARY' | 'VISIT_DETAIL' | 'SETTINGS'>('LOGIN');
  const [visitas, setVisitas] = useState<any[]>([]);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [catalogoMedicamentos, setCatalogoMedicamentos] = useState<any[]>([]);
  const [selectedVisitaId, setSelectedVisitaId] = useState<string | null>(null);
  const [profesionalNombre, setProfesionalNombre] = useState<string | undefined>(undefined);

  // Estado de red global
  const [isOnline, setIsOnline] = useState(true);

  // fake-indexeddb (usado porque RN no tiene IndexedDB real) es solo en memoria:
  // si no esperamos a restaurar el snapshot en disco antes de la primera lectura,
  // un reinicio de la app parece haber "perdido" todos los datos offline.
  const [dbReady, setDbReady] = useState(false);

  // Evita que se muestre el login por una fracción de segundo mientras se
  // consulta si ya había una sesión de Keycloak guardada (ver keycloakAuth.ts).
  const [authChecked, setAuthChecked] = useState(false);

  // Sesión persistida (SecureStore): si existe y tiene el rol de acceso, entra
  // directo al itinerario sin pasar por Keycloak de nuevo. Se resuelve una sola
  // vez al arrancar, con el estado de red que haya en ese momento (isOnline
  // arranca en `true`; si en realidad no hay señal, restoreSession igual
  // confía en el token guardado sin intentar refrescarlo, ver keycloakAuth.ts).
  useEffect(() => {
    if (AUTH_MODE !== 'keycloak') {
      setAuthChecked(true);
      return;
    }
    restoreSession(isOnline)
      .then((restored) => {
        if (restored && hasKeycloakAccessRole()) {
          setCurrentScreen('ITINERARY');
        }
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleDescargarDatos = async () => {
    try {
      console.log("Sincronizando datos con el backend...");
      if (isOnline) {
        const resultado = await syncService.descargarDatosDelDia();
        if (resultado.profesional) {
          setProfesionalNombre(`${resultado.profesional.nombres} ${resultado.profesional.apellidos}`.trim());
        }
      }
      const localVisitas = await db.visitas.toArray();
      const localPlantillas = await db.plantillas.toArray();
      const localCatalogoMedicamentos = await db.catalogoMedicamentos.toArray();

      setVisitas(localVisitas);
      setPlantillas(localPlantillas);
      setCatalogoMedicamentos(localCatalogoMedicamentos);
    } catch (err) {
      console.error("Fallo al descargar datos del backend:", err);
      // Sin conexión y sin nada previamente sincronizado: no hay datos reales que
      // mostrar, así que la lista queda vacía (la UI ya maneja el estado "sin visitas").
      const localVisitas = await db.visitas.toArray();
      const localPlantillas = await db.plantillas.toArray();
      const localCatalogoMedicamentos = await db.catalogoMedicamentos.toArray();
      setVisitas(localVisitas);
      setPlantillas(localPlantillas);
      setCatalogoMedicamentos(localCatalogoMedicamentos);
    }
  };

  const handleRegistrarAtencion = async (tipo: 'EN_CAMINO' | 'CHECK_IN' | 'CHECK_OUT' | 'FICHA_CLINICA' | 'DIAGNOSTICO' | 'MEDICAMENTO', visitaId: string, data: any) => {
    try {
      await syncService.guardarAtencionLocal(tipo, visitaId, data);
      console.log(`Atención guardada localmente en Dexie: ${tipo} para visita ${visitaId}`);
      intentarSincronizarPendientes();
    } catch (err) {
      console.error("Error guardando atención en IndexedDB:", err);
    }
  };

  // Sube la cola pendiente sin intervención manual. Se llama apenas se encola
  // un registro nuevo y, como respaldo, en un intervalo periódico mientras haya
  // señal (por si un intento anterior falló o quedaron registros de una sesión previa).
  const intentarSincronizarPendientes = async () => {
    if (!isOnline) return;
    try {
      const pendientes = await db.syncQueue.count();
      if (pendientes === 0) return;
      const resultado = await syncService.sincronizarRegistrosPendientes();
      console.log(`Auto-sincronización: ${resultado.procesados} procesados, ${resultado.fallidos} fallidos`);
    } catch (err) {
      console.error("Error en auto-sincronización:", err);
    }
  };

  // Restaurar la cola/datos offline guardados en disco antes de que cualquier
  // pantalla lea `db` (ver src/database/offlineDbPersistence.ts).
  useEffect(() => {
    hydrateFromSnapshot()
      .catch(err => console.error('Error restaurando datos offline:', err))
      .finally(() => setDbReady(true));
  }, []);

  // Inicializar base de datos local y descargar datos dinámicos
  useEffect(() => {
    if (!dbReady) return;
    handleDescargarDatos();
  }, [isOnline, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    if (!isOnline) return;
    intentarSincronizarPendientes();
    const interval = setInterval(intentarSincronizarPendientes, 20000);
    return () => clearInterval(interval);
  }, [isOnline, dbReady]);

  const handleLoginSuccess = () => {
    setCurrentScreen('ITINERARY');
    // El intento automático de descarga en el arranque (línea arriba) ocurre antes
    // del login, así que en modo Keycloak siempre falla por falta de token. Ahora
    // que ya hay sesión, hay que reintentar para traer los datos reales.
    handleDescargarDatos();
  };

  // Cierra la sesión de Keycloak (limpia memoria + SecureStore, ver
  // keycloakAuth.ts) y manda de vuelta al login. En modo mock no hay sesión
  // real que limpiar, pero llamar a logoutFromKeycloak() igual es inofensivo.
  const handleLogout = () => {
    logoutFromKeycloak();
    setCurrentScreen('LOGIN');
    setVisitas([]);
    setPlantillas([]);
    setProfesionalNombre(undefined);
  };

  const handleSelectVisita = (id: string) => {
    setSelectedVisitaId(id);
    setCurrentScreen('VISIT_DETAIL');
  };

  const handleUpdateVisitaState = async (visitaId: string, nuevoEstado: string, datosConsulta?: any) => {
    // 1. Actualizar el estado de React
    setVisitas(prevVisitas =>
      prevVisitas.map(v =>
        v.id === visitaId
          ? { ...v, estado: nuevoEstado, ...datosConsulta }
          : v
      )
    );

    // 2. Persistir localmente en la base de datos de IndexedDB (Dexie)
    try {
      await db.visitas.update(visitaId, { estado: nuevoEstado, ...datosConsulta });
      console.log(`Visita ${visitaId} actualizada en IndexedDB.`);
    } catch (err) {
      console.error("Error actualizando visita en Dexie:", err);
    }
  };

  // Solicitar continuidad de atención para un paciente frágil: el profesional no
  // agenda la visita de seguimiento directamente, encola una solicitud de alerta que
  // el coordinador revisa (POST /alertas, tipo CONTINUIDAD) al sincronizar.
  const handleSolicitarContinuidad = async (visitaBase: any, diasSeguimiento: string) => {
    try {
      await syncService.guardarAtencionLocal('SOLICITUD_CONTINUIDAD', visitaBase.id, {
        pacienteId: visitaBase.pacienteId,
        mensaje: `Paciente frágil: se solicita visita de seguimiento en ${diasSeguimiento} días.`,
      });
      console.log(`Solicitud de continuidad encolada para visita ${visitaBase.id} (${diasSeguimiento} días)`);
    } catch (err) {
      console.error("Error al encolar la solicitud de continuidad:", err);
    }
  };

  const selectedVisita = visitas.find(v => v.id === selectedVisitaId);

  // Evita el parpadeo de la pantalla de login mientras se resuelve si ya
  // había una sesión de Keycloak guardada (ver useEffect de restoreSession).
  if (!authChecked) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <VStack flex={1}>

        {/* Renderizado de Pantalla Activa */}
        <View style={styles.screenContainer}>
          {currentScreen === 'LOGIN' && (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          )}
          {currentScreen === 'ITINERARY' && (
            <ItineraryScreen
              visitas={visitas}
              onSelectVisita={handleSelectVisita}
              isOnline={isOnline}
              onSync={handleDescargarDatos}
              profesionalNombre={profesionalNombre}
            />
          )}
          {currentScreen === 'VISIT_DETAIL' && selectedVisita && (
            <VisitDetailScreen
              visita={selectedVisita}
              plantillas={plantillas}
              catalogoMedicamentos={catalogoMedicamentos}
              onBack={() => setCurrentScreen('ITINERARY')}
              onUpdateVisitaState={handleUpdateVisitaState}
              onRegisterAttention={handleRegistrarAtencion}
              onScheduleFollowUp={handleSolicitarContinuidad}
            />
          )}
          {currentScreen === 'SETTINGS' && (
            <SettingsScreen
              isOnline={isOnline}
              onToggleOnline={setIsOnline}
              onLogout={handleLogout}
            />
          )}
        </View>

        {/* Barra de Navegación Inferior (Bottom Tab Bar) */}
        {currentScreen !== 'LOGIN' && currentScreen !== 'VISIT_DETAIL' && (
          <HStack style={styles.tabBar} bg={theme.colors.white} align="center">

            {/* Pestaña Itinerario */}
            <TouchableOpacity
              style={[styles.tabButton, currentScreen === 'ITINERARY' && styles.tabButtonActive]}
              onPress={() => setCurrentScreen('ITINERARY')}
              activeOpacity={0.8}
            >
              <VStack align="center" gap="xs">
                <Calendar
                  size={20}
                  color={currentScreen === 'ITINERARY' ? theme.colors.yaleBlue : theme.colors.grayText}
                />
                <Label
                  variant="caption"
                  color={currentScreen === 'ITINERARY' ? theme.colors.yaleBlue : theme.colors.grayText}
                  style={{ fontWeight: currentScreen === 'ITINERARY' ? 'bold' : 'normal', fontSize: 11 }}
                >
                  Itinerario
                </Label>
              </VStack>
            </TouchableOpacity>

            {/* Pestaña Configuración */}
            <TouchableOpacity
              style={[styles.tabButton, currentScreen === 'SETTINGS' && styles.tabButtonActive]}
              onPress={() => setCurrentScreen('SETTINGS')}
              activeOpacity={0.8}
            >
              <VStack align="center" gap="xs">
                <Settings
                  size={20}
                  color={currentScreen === 'SETTINGS' ? theme.colors.yaleBlue : theme.colors.grayText}
                />
                <Label
                  variant="caption"
                  color={currentScreen === 'SETTINGS' ? theme.colors.yaleBlue : theme.colors.grayText}
                  style={{ fontWeight: currentScreen === 'SETTINGS' ? 'bold' : 'normal', fontSize: 11 }}
                >
                  Ajustes / Sync
                </Label>
              </VStack>
            </TouchableOpacity>

          </HStack>
        )}

      </VStack>
      <ExpoStatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenContainer: {
    flex: 1,
    width: '100%',
  },
  tabBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: theme.colors.alabasterGrey,
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    // Estilo sutil para pestaña activa
  },
});

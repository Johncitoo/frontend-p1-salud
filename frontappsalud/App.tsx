import React, { useState, useEffect } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
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

import { syncService } from './src/services/syncService';

export default function App() {
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
  const handleSolicitarContinuidad = async (visitaBase: any) => {
    try {
      await syncService.guardarAtencionLocal('SOLICITUD_CONTINUIDAD', visitaBase.id, {
        pacienteId: visitaBase.pacienteId,
        mensaje: `Paciente frágil: se solicita visita de seguimiento tras "${visitaBase.prestacion}".`,
      });
      console.log(`Solicitud de continuidad encolada para visita ${visitaBase.id}`);
    } catch (err) {
      console.error("Error al encolar la solicitud de continuidad:", err);
    }
  };

  const selectedVisita = visitas.find(v => v.id === selectedVisitaId);

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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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

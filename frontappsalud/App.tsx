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
import { Calendar, Settings } from 'lucide-react-native';

// Datos de prueba iniciales basados en las tablas de bd.sql
const INITIAL_VISITAS = [
  {
    id: "v1",
    hora: "09:00 AM",
    estado: "REALIZADA",
    prioridad: "NORMAL",
    paciente: {
      nombres: "Juan Carlos",
      apellidos: "Gómez Pérez",
      rut: "12.345.678-9",
    },
    direccion: {
      calle: "Av. Providencia",
      numero: "1045",
      comuna: "Providencia",
    },
    prestacion: "Control Presión y Curación simple",
  },
  {
    id: "v2",
    hora: "11:30 AM",
    estado: "EN_ATENCION",
    prioridad: "URGENTE",
    paciente: {
      nombres: "María Elena",
      apellidos: "Soto Silva",
      rut: "9.876.543-2",
    },
    direccion: {
      calle: "Calle Los Magnolios",
      numero: "450",
      comuna: "Maipú",
    },
    prestacion: "Terapia Kinesiológica Respiratoria",
  },
  {
    id: "v3",
    hora: "03:00 PM",
    estado: "PROGRAMADA",
    prioridad: "ALTA",
    paciente: {
      nombres: "Pedro Andrés",
      apellidos: "Morales Díaz",
      rut: "15.678.901-k",
    },
    direccion: {
      calle: "Pasaje El Vergel",
      numero: "12",
      comuna: "La Florida",
    },
    prestacion: "Administración Antibiótico EV",
  },
  {
    id: "v4",
    hora: "05:30 PM",
    estado: "PROGRAMADA",
    prioridad: "BAJA",
    paciente: {
      nombres: "Ana María",
      apellidos: "Rojas Castro",
      rut: "7.654.321-0",
    },
    direccion: {
      calle: "Av. Las Condes",
      numero: "8900",
      comuna: "Las Condes",
    },
    prestacion: "Evaluación clínica general",
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'LOGIN' | 'ITINERARY' | 'VISIT_DETAIL' | 'SETTINGS'>('LOGIN');
  const [visitas, setVisitas] = useState(INITIAL_VISITAS);
  const [selectedVisitaId, setSelectedVisitaId] = useState<string | null>(null);
  
  // Estado de red global
  const [isOnline, setIsOnline] = useState(true);

  // Inicializar base de datos local Dexie con datos semilla si está vacía
  useEffect(() => {
    const seedLocalDatabase = async () => {
      try {
        const count = await db.visitas.count();
        if (count === 0) {
          await db.visitas.bulkAdd(INITIAL_VISITAS);
          console.log("Semilla de visitas cargada en IndexedDB.");
        } else {
          const localItems = await db.visitas.toArray();
          setVisitas(localItems);
        }
      } catch (err) {
        console.error("Fallo al inicializar base de datos Dexie:", err);
      }
    };
    seedLocalDatabase();
  }, []);

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

  // Crear visita de seguimiento para el día de mañana (Continuidad)
  const handleCrearVisitaSeguimiento = async (visitaBase: any) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString();

    const newVisita = {
      id: `v_seg_${Date.now()}`,
      hora: "10:00 AM", // Hora estimada estándar
      estado: "PROGRAMADA",
      prioridad: "ALTA", // Prioridad alta por seguimiento de fragilidad
      paciente: visitaBase.paciente,
      direccion: visitaBase.direccion,
      prestacion: `Seguimiento clínico: ${visitaBase.prestacion}`,
    };

    // 1. Añadir al estado de React
    setVisitas(prev => [newVisita, ...prev]);

    // 2. Guardar en Dexie para persistencia offline
    try {
      await db.visitas.add(newVisita);
      console.log("Nueva visita de seguimiento creada en Dexie.");
    } catch (err) {
      console.error("Error al añadir visita de seguimiento en Dexie:", err);
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
            />
          )}
          {currentScreen === 'VISIT_DETAIL' && selectedVisita && (
            <VisitDetailScreen 
              visita={selectedVisita}
              onBack={() => setCurrentScreen('ITINERARY')}
              onUpdateVisitaState={handleUpdateVisitaState}
              onScheduleFollowUp={handleCrearVisitaSeguimiento}
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

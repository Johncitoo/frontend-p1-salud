import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Switch, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../theme';
import { Box, VStack, HStack } from '../components/Layout';
import { Label } from '../components/Label';
import { PrimaryButton, OutlineButton } from '../components/Button';
import { db } from '../database/offlineDb';
import { clearSnapshot } from '../database/offlineDbPersistence';
import { syncService } from '../services/syncService';
import { Wifi, WifiOff, Database, RefreshCw, Trash2, ClipboardList, LogOut } from 'lucide-react-native';

interface SettingsScreenProps {
  isOnline: boolean;
  onToggleOnline: (val: boolean) => void;
  onLogout: () => void;
}

export default function SettingsScreen({ isOnline, onToggleOnline, onLogout }: SettingsScreenProps) {
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ visits: 0, templates: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  // Cargar estadísticas y cola local de Dexie
  const loadLocalStats = async () => {
    try {
      const queue = await db.syncQueue.toArray();
      setQueueItems(queue);

      const visitsCount = await db.visitas.count();
      const templatesCount = await db.plantillas.count();
      setStats({ visits: visitsCount, templates: templatesCount });
    } catch (error) {
      console.error("Error cargando estadísticas de Dexie:", error);
    }
  };

  useEffect(() => {
    loadLocalStats();
    
    // Recargar la cola cada 3 segundos si el usuario se mantiene en esta pantalla
    const interval = setInterval(loadLocalStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline) {
      Alert.alert("Sin Conexión", "No se puede sincronizar porque la app está en modo Offline.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncService.sincronizarRegistrosPendientes();
      await loadLocalStats();
      
      Alert.alert(
        "Sincronización Completada",
        `Se procesaron ${result.procesados} registros con éxito. Fallidos: ${result.fallidos}.`
      );
    } catch (error) {
      Alert.alert("Error de Sincronización", "Ocurrió un error al subir los registros al servidor.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearDatabase = () => {
    Alert.alert(
      "Limpiar Base de Datos",
      "Esto borrará todas las visitas y plantillas guardadas localmente. La cola de sincronización pendiente también se perderá. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, borrar", 
          style: "destructive", 
          onPress: async () => {
            await db.visitas.clear();
            await db.plantillas.clear();
            await db.syncQueue.clear();
            // Table.clear() no dispara los hooks de persistencia (ver
            // offlineDbPersistence.ts) — sin esto, el snapshot viejo en disco
            // "resucitaría" los datos borrados en el próximo arranque.
            await clearSnapshot();
            await loadLocalStats();
            Alert.alert("Base de datos limpia", "Todos los registros locales han sido eliminados.");
          } 
        }
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Seguro que quieres cerrar sesión? Vas a tener que volver a iniciar sesión para seguir usando la app.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar Sesión", style: "destructive", onPress: onLogout },
      ]
    );
  };

  const formatTimestamp = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " - " + d.toLocaleDateString();
  };

  return (
    <VStack flex={1} bg={theme.colors.background} style={styles.container}>
      
      {/* Header */}
      <Box padding="md" bg={theme.colors.yaleBlue} style={styles.header}>
        <Label variant="h1" color={theme.colors.white}>Configuración y Sincronización</Label>
        <Label variant="caption" color="rgba(255,255,255,0.7)">Panel de control de conectividad offline</Label>
      </Box>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <VStack gap="md">
          
          {/* Tarjeta 1: Control de Internet (Simulador de Señal) */}
          <Box bg={theme.colors.white} radius="md" padding="md" style={styles.card}>
            <VStack gap="sm">
              <Label variant="h2" color={theme.colors.yaleBlue}>Simulador de Conectividad</Label>
              <Label variant="caption">Úsalo para probar el comportamiento de la app con y sin señal de internet.</Label>
              
              <HStack justify="space-between" align="center" style={styles.switchRow} bg="#F9F9F9" padding="sm" radius="sm">
                <HStack align="center" gap="sm">
                  {isOnline ? (
                    <Wifi size={24} color={theme.colors.success} />
                  ) : (
                    <WifiOff size={24} color={theme.colors.danger} />
                  )}
                  <Label variant="body" style={{ fontWeight: '600' }}>
                    Conexión a Internet: {isOnline ? "En Línea" : "Offline"}
                  </Label>
                </HStack>
                <Switch
                  value={isOnline}
                  onValueChange={onToggleOnline}
                  trackColor={{ false: theme.colors.alabasterGrey, true: theme.colors.success }}
                  thumbColor={theme.colors.white}
                />
              </HStack>
            </VStack>
          </Box>

          {/* Tarjeta 2: Cola de Sincronización */}
          <Box bg={theme.colors.white} radius="md" padding="md" style={styles.card}>
            <VStack gap="sm">
              <HStack justify="space-between" align="center">
                <Label variant="h2" color={theme.colors.yaleBlue}>Cola de Envío Pendiente</Label>
                {queueItems.length > 0 && (
                  <Box bg={theme.colors.danger} radius="round" padding={4} style={styles.badgeCount}>
                    <Label variant="caption" color={theme.colors.white} style={{ fontWeight: 'bold', fontSize: 12 }}>
                      {queueItems.length}
                    </Label>
                  </Box>
                )}
              </HStack>
              <Label variant="caption">Registros clínicos guardados localmente esperando señal para subirse al back.</Label>
              
              {queueItems.length === 0 ? (
                <Box padding="lg" align="center" bg="#F7FAF9" radius="sm" style={styles.emptyBox}>
                  <Label variant="body" color={theme.colors.success} style={{ fontWeight: '600' }}>
                    ✓ Todos los datos están sincronizados
                  </Label>
                </Box>
              ) : (
                <VStack gap="xs" style={styles.queueList}>
                  {queueItems.map((item, idx) => (
                    <Box key={item.id || idx} bg="#FAF8F5" style={{ borderWidth: 1, borderColor: '#F0ECE4' }} radius="sm" padding="sm">
                      <HStack justify="space-between" align="center">
                        <Label variant="body" style={{ fontWeight: 'bold' }} color={theme.colors.graphite}>
                          {item.tipo === 'FICHA_CLINICA' ? '📝 Ficha Clínica' : item.tipo === 'CHECK_IN' ? '🚪 Check-In GPS' : '🚗 Check-Out GPS'}
                        </Label>
                        <Label variant="caption" color={theme.colors.grayText}>
                          ID: {item.visita_id.substring(0, 5)}...
                        </Label>
                      </HStack>
                      <Label variant="caption" color={theme.colors.grayText} style={{ marginTop: 2 }}>
                        Guardado local: {formatTimestamp(item.timestamp)}
                      </Label>
                    </Box>
                  ))}
                </VStack>
              )}

              <PrimaryButton 
                isLoading={isSyncing} 
                disabled={queueItems.length === 0 || !isOnline}
                onPress={handleSyncNow}
                style={{ marginTop: 8 }}
              >
                {isSyncing ? "Sincronizando..." : "Sincronizar Cola de Envío"}
              </PrimaryButton>
            </VStack>
          </Box>

          {/* Tarjeta 3: Estado de la Base de Datos Local */}
          <Box bg={theme.colors.white} radius="md" padding="md" style={styles.card}>
            <VStack gap="sm">
              <Label variant="h2" color={theme.colors.yaleBlue}>Base de Datos Local (IndexedDB)</Label>
              
              <HStack justify="space-around" align="center" style={{ marginVertical: 8 }}>
                <VStack align="center">
                  <Database size={24} color={theme.colors.yaleBlue} />
                  <Label variant="h2" style={{ marginTop: 4 }}>{stats.visits}</Label>
                  <Label variant="caption">Visitas</Label>
                </VStack>
                
                <VStack align="center">
                  <ClipboardList size={24} color={theme.colors.stormyTeal} />
                  <Label variant="h2" style={{ marginTop: 4 }}>{stats.templates}</Label>
                  <Label variant="caption">Plantillas</Label>
                </VStack>
              </HStack>

              <View style={styles.divider} />

              <OutlineButton
                style={styles.dangerOutline}
                onPress={handleClearDatabase}
              >
                <HStack align="center" gap="xs">
                  <Trash2 size={16} color={theme.colors.danger} />
                  <Label variant="caption" color={theme.colors.danger} style={{ fontWeight: 'bold' }}>
                    Limpiar Almacenamiento Local
                  </Label>
                </HStack>
              </OutlineButton>
            </VStack>
          </Box>

          {/* Tarjeta 4: Cerrar sesión */}
          <Box bg={theme.colors.white} radius="md" padding="md" style={styles.card}>
            <OutlineButton
              style={styles.dangerOutline}
              onPress={handleLogoutPress}
            >
              <HStack align="center" gap="xs">
                <LogOut size={16} color={theme.colors.danger} />
                <Label variant="caption" color={theme.colors.danger} style={{ fontWeight: 'bold' }}>
                  Cerrar Sesión
                </Label>
              </HStack>
            </OutlineButton>
          </Box>

        </VStack>
      </ScrollView>
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  header: {
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  switchRow: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginTop: theme.spacing.xs,
  },
  badgeCount: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: '#E6EFEA',
  },
  queueList: {
    maxHeight: 220,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: theme.spacing.xs,
  },
  dangerOutline: {
    borderColor: theme.colors.danger,
    height: 44,
  },
});

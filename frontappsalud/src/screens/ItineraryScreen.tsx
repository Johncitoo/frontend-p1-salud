import React, { useState } from 'react';
import { FlatList, TouchableOpacity, View, TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Box, VStack, HStack } from '../components/Layout';
import { Label } from '../components/Label';
import { Card } from '../components/Card';
import { Search, Wifi, WifiOff, RefreshCw, ChevronRight } from 'lucide-react-native';

interface ItineraryScreenProps {
  visitas: any[];
  onSelectVisita: (visitaId: string) => void;
  isOnline: boolean;
  onSync: () => Promise<void>;
  profesionalNombre?: string;
}

export default function ItineraryScreen({ visitas, onSelectVisita, isOnline, onSync, profesionalNombre }: ItineraryScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtrado de pacientes en caliente
  const filteredVisitas = visitas.filter(v => {
    const fullName = `${v.paciente.nombres} ${v.paciente.apellidos}`.toLowerCase();
    const address = `${v.direccion.calle} ${v.direccion.comuna}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || address.includes(query);
  });

  // Ordenar: las visitas completadas (REALIZADA) se van al final de la lista
  const sortedVisitas = [...filteredVisitas].sort((a, b) => {
    if (a.estado === "REALIZADA" && b.estado !== "REALIZADA") return 1;
    if (a.estado !== "REALIZADA" && b.estado === "REALIZADA") return -1;
    return 0; // Mantiene el orden original por hora para visitas del mismo grupo
  });

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await onSync();
    } catch (error) {
      console.error("Error al sincronizar visitas:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case "URGENTE": return theme.colors.danger;
      case "ALTA": return "#E28743"; // Naranja
      case "NORMAL": return theme.colors.yaleBlue;
      default: return theme.colors.grayText;
    }
  };

  const getPriorityBg = (prioridad: string) => {
    switch (prioridad) {
      case "URGENTE": return "#FBEAEC";
      case "ALTA": return "#FDF2E9";
      case "NORMAL": return "#EBF3F6";
      default: return "#F0F0F0";
    }
  };

  const getPriorityLabel = (prioridad: string) => {
    switch (prioridad) {
      case "URGENTE": return "Urgente";
      case "ALTA": return "Alta";
      case "NORMAL": return "Normal";
      default: return prioridad;
    }
  };

  const getStatusStyle = (estado: string) => {
    switch (estado) {
      case "REALIZADA":
        return { bg: "#E2ECE9", text: theme.colors.success, label: "Realizada" };
      case "EN_ATENCION":
        return { bg: "#FDF2E9", text: "#E28743", label: "En Atención" };
      case "EN_CAMINO":
        return { bg: "#EBF3F6", text: theme.colors.stormyTeal, label: "En Camino" };
      default:
        return { bg: "#F0F0F0", text: theme.colors.graphite, label: "Programada" };
    }
  };

  return (
    <VStack flex={1} bg={theme.colors.background} style={styles.container}>
      
      {/* 1. Header Superior de Usuario y Estado de Conexión */}
      <Box padding="md" bg={theme.colors.yaleBlue} radius="sm" style={styles.header}>
        <HStack justify="space-between" align="center" width="100%">
          <VStack>
            <Label variant="caption" color="rgba(255,255,255,0.7)">Bienvenido/a</Label>
            <Label variant="h1" color={theme.colors.white}>{profesionalNombre ?? 'Profesional'}</Label>
          </VStack>
          
          <View 
            style={[styles.connectionBadge, { backgroundColor: isOnline ? 'rgba(42, 157, 143, 0.2)' : 'rgba(230, 57, 70, 0.2)' }]}
          >
            <HStack align="center" gap="xs">
              {isOnline ? (
                <>
                  <Wifi size={14} color={theme.colors.success} />
                  <Label variant="caption" color={theme.colors.success} style={{ fontWeight: '600' }}>En Línea</Label>
                </>
              ) : (
                <>
                  <WifiOff size={14} color={theme.colors.danger} />
                  <Label variant="caption" color={theme.colors.danger} style={{ fontWeight: '600' }}>Offline</Label>
                </>
              )}
            </HStack>
          </View>
        </HStack>
      </Box>

      {/* 2. Barra de Búsqueda y Botón de Sincronización */}
      <Box padding="md">
        <HStack gap="sm" align="center" width="100%">
          <View style={styles.searchContainer}>
            <Search size={18} color={theme.colors.grayText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por paciente o comuna..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.grayText}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.syncButton, !isOnline && styles.syncButtonDisabled]} 
            onPress={handleSync}
            disabled={isSyncing || !isOnline}
            activeOpacity={0.7}
          >
            <RefreshCw size={20} color={theme.colors.white} style={isSyncing ? styles.spinning : null} />
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* 3. Panel de Resumen del Día */}
      <Box margin="md" style={styles.summaryCard} padding="md" bg={theme.colors.white} radius="md">
        <HStack justify="space-around" align="center" width="100%">
          <VStack align="center">
            <Label variant="h2" color={theme.colors.yaleBlue}>{visitas.length}</Label>
            <Label variant="caption">Totales</Label>
          </VStack>
          <View style={styles.divider} />
          <VStack align="center">
            <Label variant="h2" color={theme.colors.success}>
              {visitas.filter(v => v.estado === "REALIZADA").length}
            </Label>
            <Label variant="caption">Completas</Label>
          </VStack>
          <View style={styles.divider} />
          <VStack align="center">
            <Label variant="h2" color="#E28743">
              {visitas.filter(v => v.estado === "EN_ATENCION" || v.estado === "EN_CAMINO").length}
            </Label>
            <Label variant="caption">En Curso</Label>
          </VStack>
        </HStack>
      </Box>

      {/* 4. Listado de Visitas en Tarjetas */}
      <FlatList
        data={sortedVisitas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Box padding="xl" align="center">
            <Label variant="body" color={theme.colors.grayText}>No hay visitas programadas</Label>
          </Box>
        }
        renderItem={({ item }) => {
          const status = getStatusStyle(item.estado);
          const priorityColor = getPriorityColor(item.prioridad);
          
          return (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => onSelectVisita(item.id)}
              style={styles.cardContainer}
            >
              <Card style={styles.cardOverride}>
                <HStack justify="space-between" align="stretch" width="100%">
                  {/* Indicador de Prioridad Lateral Izquierdo */}
                  <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
                  
                  {/* Cuerpo de la Tarjeta */}
                  <VStack flex={1} gap="xs" style={styles.cardBody}>
                    <HStack justify="space-between" align="center" width="100%">
                      <HStack gap="xs" align="center">
                        <Label variant="caption" style={{ fontWeight: 'bold' }} color={theme.colors.grayText}>
                          {item.hora}
                        </Label>

                        <Box padding={4} radius="sm" bg={getPriorityBg(item.prioridad)}>
                          <Label variant="caption" color={priorityColor} style={{ fontSize: 11, fontWeight: 'bold' }}>
                            {getPriorityLabel(item.prioridad)}
                          </Label>
                        </Box>
                      </HStack>

                      <Box padding={4} radius="sm" bg={status.bg}>
                        <Label variant="caption" color={status.text} style={{ fontSize: 12, fontWeight: 'bold' }}>
                          {status.label}
                        </Label>
                      </Box>
                    </HStack>

                    <Label variant="h2" color={theme.colors.graphite}>
                      {item.paciente.nombres} {item.paciente.apellidos}
                    </Label>

                    <Label variant="caption" color={theme.colors.grayText}>
                      📍 {item.direccion.calle} {item.direccion.numero}, {item.direccion.comuna}
                    </Label>

                    <Label variant="caption" color={theme.colors.yaleBlue} style={styles.prestacionText}>
                      💼 {item.prestacion}
                    </Label>
                  </VStack>

                  {/* Flecha Derecha de Navegación */}
                  <VStack justify="center" align="center" style={styles.arrowContainer}>
                    <ChevronRight size={20} color={theme.colors.alabasterGrey} />
                  </VStack>
                </HStack>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
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
  connectionBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.round,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    borderRadius: theme.radius.md,
    height: 44,
    paddingHorizontal: theme.spacing.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: theme.colors.graphite,
    fontSize: 15,
  },
  syncButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.stormyTeal,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: theme.colors.alabasterGrey,
    opacity: 0.6,
  },
  spinning: {
    // Nota: en producción puedes añadir animación rotativa real con Animated API
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.alabasterGrey,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  cardContainer: {
    marginBottom: theme.spacing.sm,
  },
  cardOverride: {
    padding: 0, // quitamos el padding del Card base para manejarlo a medida
    overflow: 'hidden',
  },
  priorityBar: {
    width: 6,
    height: '100%',
  },
  cardBody: {
    padding: theme.spacing.md,
    paddingLeft: theme.spacing.sm,
  },
  arrowContainer: {
    paddingHorizontal: theme.spacing.sm,
  },
  prestacionText: {
    marginTop: 4,
    fontWeight: '500',
  },
});

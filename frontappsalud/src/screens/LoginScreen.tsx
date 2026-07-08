import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { Card, CardHeader, CardContent, CardFooter } from '../components/Card';
import { Label } from '../components/Label';
import { FormInput } from '../components/Input';
import { PrimaryButton } from '../components/Button';
import { VStack, HStack } from '../components/Layout';
import { AUTH_MODE } from '../services/syncService';
import { loginWithKeycloak, hasKeycloakAccessRole, logoutFromKeycloak } from '../services/keycloakAuth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // El client "p1" de Keycloak solo admite el flujo de navegador (Authorization
  // Code + PKCE): el email/contraseña tipeados acá no se usan en modo keycloak.
  // El login abre el navegador del sistema (Custom Tabs en Android) en vez de
  // un WebView propio: el Keycloak del Grupo 12 corre detrás de un túnel ngrok
  // gratuito cuyo aviso de advertencia rompe los recursos JS/CSS de la página
  // dentro de un WebView (ver comentario en keycloakAuth.ts).
  const handleSubmitKeycloak = async () => {
    setIsLoading(true);
    try {
      await loginWithKeycloak();

      // Gate de acceso: realm_access.roles debe incluir p1-access (rol
      // centralizado del Grupo 12 que habilita el ingreso a Proyecto 1).
      // El rol de aplicación específico (resource_access.p1.roles) lo
      // resuelve el backend en cada request, no hace falta acá.
      if (!hasKeycloakAccessRole()) {
        logoutFromKeycloak();
        Alert.alert(
          'Acceso denegado',
          'Tu cuenta existe en el Sistema de Identidad, pero no tiene el rol de acceso requerido para Proyecto 1.',
        );
        return;
      }

      onLoginSuccess();
    } catch (err: any) {
      Alert.alert('No se pudo iniciar sesión', err?.message ?? 'Error desconocido al conectar con Keycloak.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitMock = () => {
    if (!email || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      console.log("Login attempt:", { email, password, rememberMe });
      setIsLoading(false);
      onLoginSuccess();
    }, 1500);
  };

  const handleSubmit = AUTH_MODE === 'keycloak' ? handleSubmitKeycloak : handleSubmitMock;

  // En modo keycloak no hay formulario propio que llenar (los campos de
  // email/contraseña de esta pantalla son cosméticos y no se usan contra el
  // Sistema de Identidad del Grupo 12): pantalla mínima con un solo botón que
  // abre el navegador del sistema hacia el login centralizado.
  if (AUTH_MODE === 'keycloak') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <VStack align="center" gap="md">
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.stormyTeal} />
          ) : (
            <PrimaryButton onPress={handleSubmitKeycloak}>Iniciar Sesión</PrimaryButton>
          )}
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: theme.spacing.md 
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <VStack gap="md">
              <CardHeader>
                <VStack align="center" gap="xs">
                  <Label variant="h1" color={theme.colors.yaleBlue}>
                    Iniciar Sesión
                  </Label>
                  <Label variant="caption" style={{ textAlign: 'center' }}>
                    Ingresa tus credenciales para acceder a la app
                  </Label>
                </VStack>
              </CardHeader>

              <CardContent>
                <VStack gap="md">
                  <FormInput
                    label="Correo Electrónico"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@ejemplo.com"
                    keyboardType="email-address"
                  />

                  <FormInput
                    label="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    isPassword
                  />

                  <HStack justify="space-between" align="center" width="100%">
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
                      activeOpacity={0.8}
                      onPress={() => setRememberMe(!rememberMe)}
                    >
                      <Switch
                        value={rememberMe}
                        onValueChange={setRememberMe}
                        trackColor={{ false: theme.colors.alabasterGrey, true: theme.colors.stormyTeal }}
                        thumbColor={theme.colors.white}
                        ios_backgroundColor={theme.colors.alabasterGrey}
                        style={{ 
                          transform: Platform.OS === 'ios' 
                            ? [{ scaleX: 0.75 }, { scaleY: 0.75 }] 
                            : [{ scaleX: 0.9 }, { scaleY: 0.9 }] 
                        }}
                      />
                      <Label variant="caption">Recordarme</Label>
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.7}>
                      <Label 
                        variant="caption" 
                        color={theme.colors.yaleBlue} 
                        style={{ textDecorationLine: 'underline' }}
                      >
                        ¿Olvidaste tu contraseña?
                      </Label>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              </CardContent>

              <CardFooter>
                <PrimaryButton 
                  isLoading={isLoading} 
                  onPress={handleSubmit}
                >
                  Iniciar Sesión
                </PrimaryButton>
              </CardFooter>
            </VStack>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

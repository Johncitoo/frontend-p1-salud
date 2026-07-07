import React, { useState } from 'react';
import { Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { Card, CardHeader, CardContent, CardFooter } from '../components/Card';
import { Label } from '../components/Label';
import { FormInput } from '../components/Input';
import { PrimaryButton } from '../components/Button';
import { VStack, HStack } from '../components/Layout';
import { AUTH_MODE } from '../services/syncService';
import { loginWithKeycloak } from '../services/keycloakAuth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // El client "p1" de Keycloak solo admite el flujo de navegador (Authorization
  // Code + PKCE): el email/contraseña tipeados acá no se usan en modo keycloak,
  // el login real ocurre en la pantalla del navegador que abre Keycloak.
  const handleSubmitKeycloak = async () => {
    setIsLoading(true);
    try {
      await loginWithKeycloak();
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

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Keycloak centralizado del Grupo 12 (Proyecto 12), compartido por todos los
// proyectos. Mismo realm/cliente que usa el frontend web (frontend-p1-salud/
// src/features/auth/keycloak.ts). Ver backend-p1-salud/docs/INTEGRACION-IDENTIDADES-GRUPO12.md.
const KEYCLOAK_ISSUER = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER;
const KEYCLOAK_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID || 'p1';

export type KeycloakSession = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number; // epoch ms
};

// Sesión en memoria únicamente (no persiste entre reinicios de la app, igual que
// el resto del estado local por ahora vía fake-indexeddb). Alcanza para probar el
// flujo; persistencia real (expo-secure-store) queda para cuando esto se valide.
let currentSession: KeycloakSession | null = null;

export function getCurrentAccessToken(): string | undefined {
  return currentSession?.accessToken;
}

function requireIssuer(): string {
  if (!KEYCLOAK_ISSUER) {
    throw new Error(
      'EXPO_PUBLIC_KEYCLOAK_ISSUER no está configurado (ver .env / .env.example).'
    );
  }
  return KEYCLOAK_ISSUER;
}

// El client "p1" es público y solo tiene habilitado el flujo de navegador
// (Authorization Code + PKCE) — no admite login directo usuario/contraseña
// (grant_type=password fue probado y rechazado: "Client not allowed for direct
// access grants"). Por eso el login real abre el navegador hacia Keycloak en vez
// de mandar el email/password tipeados en esta pantalla directamente al backend.
export async function loginWithKeycloak(): Promise<KeycloakSession> {
  const issuer = requireIssuer();
  const discovery = await AuthSession.fetchDiscoveryAsync(issuer);

  // IMPORTANTE: este redirectUri (frontappsalud://auth) tiene que estar
  // registrado como "Valid Redirect URI" en el cliente `p1` de Keycloak (lo
  // gestiona Yamira, Grupo 12) o el navegador no podrá volver a la app tras el
  // login. Bajo Expo Go (sin dev client / build standalone), los esquemas
  // custom no siempre son entregados de vuelta a la app — probar con un dev
  // client o build de desarrollo si el redirect no vuelve.
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'frontappsalud', path: 'auth' });

  const request = new AuthSession.AuthRequest({
    clientId: KEYCLOAK_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) {
    throw new Error(`Login de Keycloak no completado (${result.type}).`);
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: KEYCLOAK_CLIENT_ID,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    discovery,
  );

  currentSession = {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    idToken: tokenResponse.idToken,
    expiresAt: Date.now() + (tokenResponse.expiresIn ?? 300) * 1000,
  };

  return currentSession;
}

export function logoutFromKeycloak(): void {
  currentSession = null;
}

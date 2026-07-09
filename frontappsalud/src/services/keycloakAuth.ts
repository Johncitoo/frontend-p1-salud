import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

const SESSION_STORAGE_KEY = 'keycloak_session_v1';

// Keycloak centralizado del Grupo 12 (Proyecto 12), compartido por todos los
// proyectos. Mismo realm/cliente que usa el frontend web (frontend-p1-salud/
// src/features/auth/keycloak.ts). Ver backend-p1-salud/docs/INTEGRACION-IDENTIDADES-GRUPO12.md.
const KEYCLOAK_ISSUER = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER;
const KEYCLOAK_CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID || 'p1';
// Rol "gate" que habilita el acceso a Proyecto 1 dentro del Keycloak centralizado
// (Grupo 12). Vive en realm_access.roles, separado del rol de aplicación
// (admin/professional/etc.) que vive en resource_access.p1.roles. Mismo criterio
// que frontend-p1-salud/src/features/auth/keycloak.ts.
const KEYCLOAK_ACCESS_ROLE = process.env.EXPO_PUBLIC_KEYCLOAK_ACCESS_ROLE || 'p1-access';

export type KeycloakSession = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number; // epoch ms
};

// Cache en memoria de la sesión activa; el respaldo persistente vive en
// SecureStore (Keystore/Keychain cifrado) bajo SESSION_STORAGE_KEY, para que la
// app pueda entrar directo sin pedir login de nuevo tras cerrar/reiniciar
// (crítico para el caso de uso offline: un profesional sin señal no puede volver
// a pasar por el login de Keycloak, que requiere red).
let currentSession: KeycloakSession | null = null;

export function getCurrentAccessToken(): string | undefined {
  return currentSession?.accessToken;
}

function persistSession(session: KeycloakSession): void {
  SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session)).catch((err) =>
    console.error('No se pudo guardar la sesión de Keycloak en SecureStore:', err),
  );
}

function clearPersistedSession(): void {
  SecureStore.deleteItemAsync(SESSION_STORAGE_KEY).catch(() => {});
}

// Renueva en silencio el access token de la sesión activa si ya venció o está
// por vencer (usa el refresh token contra Keycloak). Se usa tanto al arrancar
// la app (restoreSession) como periódicamente mientras queda abierta (ver
// startTokenAutoRefresh en App.tsx): sin esto, una jornada de terreno de varias
// horas hace que el access token expire a mitad de uso y el profesional
// empiece a ver errores de sincronización sin haber hecho nada raro.
async function refreshCurrentSessionIfNeeded(isOnline: boolean): Promise<boolean> {
  if (!currentSession) return false;

  const isExpiringSoon = Date.now() > currentSession.expiresAt - 60_000;
  if (!isOnline || !isExpiringSoon) return true;
  if (!currentSession.refreshToken) return true;

  const issuer = requireIssuer();
  const discovery = await AuthSession.fetchDiscoveryAsync(issuer);
  const refreshed = await AuthSession.refreshAsync(
    { clientId: KEYCLOAK_CLIENT_ID, refreshToken: currentSession.refreshToken },
    discovery,
  );

  currentSession = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? currentSession.refreshToken,
    idToken: refreshed.idToken ?? currentSession.idToken,
    expiresAt: Date.now() + (refreshed.expiresIn ?? 300) * 1000,
  };
  persistSession(currentSession);
  return true;
}

// Restaura la sesión guardada (si existe) al arrancar la app, para no forzar un
// login por red en cada apertura. Con conexión, si el access token ya venció (o
// está por vencer) intenta renovarlo en silencio con el refresh token; si el
// refresh falla (revocado/expirado), descarta la sesión. Sin conexión, se
// confía en el token guardado aunque esté vencido: la app offline igual no habla
// con el backend hasta volver a sincronizar, y para entonces se reintentará el
// refresh (ver syncService).
export async function restoreSession(isOnline: boolean): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) return false;

    currentSession = JSON.parse(raw);
    return await refreshCurrentSessionIfNeeded(isOnline);
  } catch (err) {
    // Token de refresco inválido/revocado, o Keycloak inalcanzable con el
    // access token ya vencido: no hay sesión utilizable, vuelve al login.
    console.error('No se pudo restaurar la sesión de Keycloak:', err);
    currentSession = null;
    clearPersistedSession();
    return false;
  }
}

// Refresca el token en silencio mientras la app sigue abierta, sin esperar a
// que el usuario reinicie la app o a que un request falle con 401 (ver
// startTokenAutoRefresh en App.tsx). Si el refresh falla (ej. red caída
// momentáneamente), no descarta la sesión: se reintenta en el próximo tick.
export async function refreshSessionIfNeeded(isOnline: boolean): Promise<void> {
  if (!currentSession) return;
  try {
    await refreshCurrentSessionIfNeeded(isOnline);
  } catch (err) {
    console.error('No se pudo renovar el token de Keycloak en segundo plano:', err);
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Decodificador base64 manual: Hermes (motor JS de React Native) no expone
// `Buffer` ni `atob` de forma confiable en todas las versiones, así que no
// conviene depender de ninguno de los dos solo para leer un JWT.
function base64Decode(input: string): string {
  const clean = input.replace(/=+$/, '');
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return decodeURIComponent(
    output
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
}

// Decodifica el payload de un JWT sin verificar la firma. Alcanza para leer los
// roles y decidir qué mostrar en la UI: la verificación real (firma, exp, issuer)
// la hace el backend en cada request contra el JWKS de Keycloak.
function decodeJwtPayload(token: string): Record<string, any> {
  const base64Url = token.split('.')[1] ?? '';
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(base64Decode(base64));
}

// Roles "gate" (realm_access.roles) del token de la sesión actual. p1-access
// indica que la cuenta tiene acceso habilitado a este proyecto.
export function getCurrentRealmRoles(): string[] {
  if (!currentSession?.accessToken) return [];
  try {
    return decodeJwtPayload(currentSession.accessToken)?.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

export function hasKeycloakAccessRole(): boolean {
  return getCurrentRealmRoles().includes(KEYCLOAK_ACCESS_ROLE);
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
// access grants"). El login real sigue pasando por la página de Keycloak (no
// podemos saltárnosla).
//
// Se usa el navegador del sistema (Custom Tabs en Android vía `promptAsync`,
// que internamente llama a `WebBrowser.openAuthSessionAsync`) en vez de un
// WebView propio: el Keycloak del Grupo 12 corre detrás de un túnel ngrok
// gratuito que exige el header `ngrok-skip-browser-warning` para no mostrar su
// página de aviso — pero ese header solo se puede mandar en la petición
// principal, no en los recursos (JS/CSS) que esa página carga después, así que
// en un WebView esos recursos quedan rotos. Un navegador real no tiene ese
// problema: si aparece el aviso de ngrok, el usuario lo puede pasar con un
// toque y de ahí en más el navegador maneja las cookies normalmente para toda
// la página. Al volver, el sistema operativo redirige solo a esta app vía el
// esquema `frontappsalud://auth` (ver `WebBrowser.maybeCompleteAuthSession()`
// al principio de este archivo).
export async function loginWithKeycloak(): Promise<KeycloakSession> {
  const issuer = requireIssuer();
  const discovery = await AuthSession.fetchDiscoveryAsync(issuer);

  // IMPORTANTE: este redirectUri (frontappsalud://auth) tiene que estar
  // registrado como "Valid Redirect URI" en el cliente `p1` de Keycloak (lo
  // gestiona Yamira, Grupo 12).
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'frontappsalud', path: 'auth' });

  const request = new AuthSession.AuthRequest({
    clientId: KEYCLOAK_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
  });

  // toolbarColor pinta la barra superior de la Custom Tab (Android) con el
  // color de la app; es lo único que se puede "reskinear" de un navegador
  // real — el contenido de la página sigue siendo el de Keycloak.
  const result = await request.promptAsync(discovery, {
    toolbarColor: '#284B63',
  });

  if (result.type !== 'success' || !result.params?.code) {
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
  persistSession(currentSession);

  return currentSession;
}

export function logoutFromKeycloak(): void {
  currentSession = null;
  clearPersistedSession();
}

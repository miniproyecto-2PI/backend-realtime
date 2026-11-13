import { initializeApp, cert, applicationDefault, getApps, App, AppOptions } from 'firebase-admin/app';
import { getAuth as getAdminAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { env } from './env';

/**
 * Inicialización única y perezosa de Firebase Admin SDK (solo Authentication).
 * Usa el MISMO proyecto y la misma forma de credenciales que el Backend API:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY (JSON en una variable; recomendado en Render)
 *  2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *  3. FIREBASE_SERVICE_ACCOUNT_PATH (archivo local, ignorado por git)
 *  4. GOOGLE_APPLICATION_CREDENTIALS
 *  5. Emulador (FIREBASE_AUTH_EMULATOR_HOST): solo projectId
 */

let firebaseApp: App | null = null;
let initError: string | null = null;

function buildAppOptions(): AppOptions | null {
  const { FIREBASE } = env;

  if (FIREBASE.serviceAccountKey) {
    try {
      return { credential: cert(JSON.parse(FIREBASE.serviceAccountKey)), projectId: FIREBASE.projectId };
    } catch (parseErr) {
      throw new Error(
        `La variable FIREBASE_SERVICE_ACCOUNT_KEY contiene un JSON inválido: ${(parseErr as Error).message}`,
        { cause: parseErr }
      );
    }
  }

  if (FIREBASE.projectId && FIREBASE.clientEmail && FIREBASE.privateKey) {
    return {
      credential: cert({
        projectId: FIREBASE.projectId,
        clientEmail: FIREBASE.clientEmail,
        privateKey: FIREBASE.privateKey,
      }),
      projectId: FIREBASE.projectId,
    };
  }

  if (FIREBASE.serviceAccountPath) {
    const resolvedPath = path.resolve(process.cwd(), FIREBASE.serviceAccountPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`No se encontró el archivo de credenciales de Firebase en la ruta: ${resolvedPath}`);
    }
    return { credential: cert(JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'))), projectId: FIREBASE.projectId };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { credential: applicationDefault(), projectId: FIREBASE.projectId };
  }

  if (FIREBASE.authEmulatorHost) {
    return { projectId: FIREBASE.projectId || 'demo-estudiemos' };
  }

  return null;
}

function initializeFirebaseApp(): App | null {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  try {
    const options = buildAppOptions();
    if (!options) {
      initError =
        'No se encontraron credenciales de Firebase configuradas. ' +
        'Defina FIREBASE_SERVICE_ACCOUNT_KEY o FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en las variables de entorno (.env).';
      console.warn(`[Firebase] Advertencia: ${initError}`);
      return null;
    }
    const app = initializeApp(options);
    initError = null;
    console.log('[Firebase] SDK inicializado correctamente.');
    return app;
  } catch (error) {
    initError = `Error al inicializar Firebase Admin: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[Firebase] ${initError}`);
    return null;
  }
}

export const getFirebaseAuth = (): Auth => {
  if (!firebaseApp) firebaseApp = initializeFirebaseApp();
  if (!firebaseApp) {
    throw new Error(initError || 'Firebase no está disponible. Verifique las credenciales en las variables de entorno.');
  }
  return getAdminAuth(firebaseApp);
};

export const isFirebaseInitialized = (): boolean => firebaseApp !== null;

export const getFirebaseInitError = (): string | null => initError;

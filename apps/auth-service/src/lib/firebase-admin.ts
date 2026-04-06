import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null;
  }

  const privateKey = privateKeyRaw.replaceAll(String.raw`\n`, '\n');
  return { projectId, clientEmail, privateKey };
}

function getFirebaseApp() {
  const cfg = getFirebaseConfig();
  if (!cfg) {
    throw new Error('Firebase Admin is not configured on auth-service');
  }

  return getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: cfg.projectId,
          clientEmail: cfg.clientEmail,
          privateKey: cfg.privateKey,
        }),
      });
}

export async function verifyGoogleIdToken(idToken: string): Promise<DecodedIdToken> {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  return auth.verifyIdToken(idToken, true);
}

import admin from "firebase-admin";

/**
 * Firebase Admin initialization.
 *
 * Supports two credential modes:
 * - applicationDefault(): uses GOOGLE_APPLICATION_CREDENTIALS (recommended for local dev)
 * - cert(): uses FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (good for hosted envs)
 */
function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const hasEnvCreds =
    !!process.env.FIREBASE_PROJECT_ID &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY;

  if (hasEnvCreds) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  return admin;
}

export const firebaseAdmin = initFirebaseAdmin();
export { admin };


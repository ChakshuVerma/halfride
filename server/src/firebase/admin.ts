import admin from 'firebase-admin';
import * as path from 'path';

const LOG_FIREBASE_INITIALIZED = '[Firebase] Admin SDK initialized'
const LOG_FIREBASE_INIT_FAILED = (message: string) => `[Firebase] Initialization failed: ${message}`

const SERVICE_ACCOUNT_KEY_PATH = path.join(process.cwd(), 'serviceAccountKey.json')

// Initialize Firebase Admin if not already initialized
let adminInitialized = false;

if (!admin.apps.length) {
  try {
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'halfride-c5355',
    });
    adminInitialized = true;
    console.log(LOG_FIREBASE_INITIALIZED);
  } catch (error: any) {
    console.error(LOG_FIREBASE_INIT_FAILED(error.message));
    adminInitialized = false;
  }
} else {
  adminInitialized = true;
}

export { admin, adminInitialized };
export type { DecodedIdToken } from 'firebase-admin/auth';

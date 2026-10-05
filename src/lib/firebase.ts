import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from "firebase/firestore";

// Set these in .env.local (see firebase/README.md). Without them the app
// runs on browser storage only, which is handy for trying things out.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

// The Firestore database, or null when the site isn't connected
export const db: Firestore | null =
  config.apiKey && config.projectId
    ? // Optional fields left undefined are skipped rather than rejected
      initializeFirestore(initializeApp(config), { ignoreUndefinedProperties: true })
    : null;

// VITE_FIREBASE_EMULATOR=true: use the Firestore emulator on this computer
// (firebase emulators:start) instead of the real database, for testing
if (db && import.meta.env.VITE_FIREBASE_EMULATOR === "true") connectFirestoreEmulator(db, "127.0.0.1", 8080);

export const errorText = (e: unknown) =>
  e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

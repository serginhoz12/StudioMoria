
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestore = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/**
 * Ensures we have an authenticated user (anonymous or otherwise).
 */
export const ensureAuthenticated = (): Promise<User> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch (err) {
          console.error("Critical: Failed to sign in anonymously", err);
          // Still resolve with null or let it hang? Standard practice is to retry or error out.
        }
      }
    });
  });
};

export const db = firestore;
export { auth, storage };
(db as any)._isMock = false;


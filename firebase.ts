
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestore = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export const db = firestore;
export { auth, storage };
(db as any)._isMock = false;


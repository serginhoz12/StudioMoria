
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD4Nna9NzeIdBcFbadUCLFxpF34tAmhI7U",
  authDomain: "studiomoria-ee74b.firebaseapp.com",
  projectId: "studiomoria-ee74b",
  storageBucket: "studiomoria-ee74b.firebasestorage.app",
  messagingSenderId: "468778625809",
  appId: "1:468778625809:web:8753ec9c18907c9631fab0",
  measurementId: "G-WR9LLBT9HE"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

export const db = firestore;
export { auth };
(db as any)._isMock = false;


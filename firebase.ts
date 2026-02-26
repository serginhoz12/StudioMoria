
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

// Check if we should use mock mode (e.g. if the real project is not accessible)
// We can set this manually or detect it. For now, we'll expose it so App.tsx can use it.
export const db = firestore;
(db as any)._isMock = false; // Set to true if you want to use mock mode by default


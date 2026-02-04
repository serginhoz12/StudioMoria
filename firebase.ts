
import { initializeApp, getApps, getApp } from "firebase/app";
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

// Singleton para o App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicialização segura para ambiente de Preview/Editor
let dbInstance: any;

try {
  // Tenta inicializar o Firestore real
  dbInstance = getFirestore(app);
  dbInstance._isMock = false;
} catch (e) {
  console.warn("Firestore inacessível no editor. Ativando modo visual-only.");
  // Mock mínimo para não quebrar as referências no App.tsx
  dbInstance = {
    _isMock: true,
    type: 'firestore-demo'
  };
}

export const db = dbInstance;

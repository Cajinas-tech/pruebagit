import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  runTransaction 
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";

// Configuración oficial de Firebase del proyecto "sendavac"
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAiCPvxZCTJVn8pbEg0OL73vE0CVaLFVhE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sendavac.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sendavac",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sendavac.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "10882053306",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:10882053306:web:35612e0e3d20ebd2647e83",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3JW1777VQN"
};

// Inicializar Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export const isConfigValid = (): boolean => true;

export { app, db, auth };

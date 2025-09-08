import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  // AQUÍ PEGA TU CONFIGURACIÓN EXISTENTE:
  apiKey: "AIzaSyC3NiSjbWqmEXBKKUijoXpsKMwE0-m1RZU",
  authDomain: "baires-inventory.firebaseapp.com",
  projectId: "baires-inventory",
  storageBucket: "baires-inventory.firebasestorage.app",
  messagingSenderId: "886640690833",
  appId: "1:886640690833:web:050726cb9e918e3cac6130"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
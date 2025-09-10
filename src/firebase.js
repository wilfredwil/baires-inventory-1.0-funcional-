import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // NUEVO para imágenes de perfil
import { getFunctions } from 'firebase/functions';
const firebaseConfig = {
  // AQUÍ PEGA TU CONFIGURACIÓN EXISTENTE:
  apiKey: "AIzaSyC3NiSjbWqmEXBKKUijoXpsKMwE0-m1RZU",
  authDomain: "baires-inventory.firebaseapp.com",
  projectId: "baires-inventory",
  storageBucket: "baires-inventory.firebasestorage.app",
  messagingSenderId: "886640690833",
  appId: "1:886640690833:web:050726cb9e918e3cac6130"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // NUEVO
export const functions = getFunctions(app);

export default app;

// NOTA: Asegúrate de reemplazar firebaseConfig con tu configuración real
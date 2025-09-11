import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC3NiSjbWqmEXBKKUijoXpsKMwE0-m1RZU",
  authDomain: "baires-inventory.firebaseapp.com",
  projectId: "baires-inventory",
  storageBucket: "baires-inventory.firebasestorage.app",
  messagingSenderId: "886640690833",
  appId: "1:886640690833:web:050726cb9e918e3cac6130"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);  // Agregar esta línea
export default app;
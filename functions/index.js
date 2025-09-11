// SOLUCIÓN 1: Cloud Function (Recomendado)
// Crea un archivo functions/index.js en tu proyecto

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.createUser = functions.https.onCall(async (data, context) => {
  // Verificar que quien llama es admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden crear usuarios');
  }

  try {
    // Crear usuario en Authentication
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
      disabled: false
    });

    // Crear documento en Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: data.email,
      name: data.name,
      role: data.role,
      active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: context.auth.token.email,
      uid: userRecord.uid
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// SOLUCIÓN 2: Modificar tu componente para usar la Cloud Function
// En tu AdvancedUserManagement.js o donde crees usuarios:

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createUserFunction = httpsCallable(functions, 'createUser');

const handleCreateUser = async (userData) => {
  try {
    setLoading(true);
    
    // Llamar a la Cloud Function en lugar de createUserWithEmailAndPassword
    const result = await createUserFunction({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: userData.role
    });

    if (result.data.success) {
      setSuccess(`Usuario ${userData.email} creado exitosamente`);
      // El admin sigue logueado
    }
  } catch (error) {
    console.error('Error creando usuario:', error);
    setError('Error al crear usuario: ' + error.message);
  } finally {
    setLoading(false);
  }
};

// SOLUCIÓN 3: Workaround temporal (mientras configuras Cloud Functions)
// Modificar tu función actual para re-autenticar al admin

const handleCreateUserWithReauth = async (userData) => {
  try {
    setLoading(true);
    
    // Guardar info del admin actual
    const currentUser = auth.currentUser;
    const adminEmail = currentUser.email;
    
    // Crear nuevo usuario (esto deslogea al admin)
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );

    // Crear documento en Firestore para el nuevo usuario
    await addDoc(collection(db, 'users'), {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      active: true,
      created_at: serverTimestamp(),
      uid: userCredential.user.uid
    });

    // IMPORTANTE: Deslogear al nuevo usuario
    await signOut(auth);

    // Re-autenticar al admin
    // NOTA: Necesitarás pedirle la contraseña al admin
    const adminPassword = prompt('Por seguridad, ingresa tu contraseña de admin para continuar:');
    if (adminPassword) {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setSuccess(`Usuario ${userData.email} creado exitosamente. Has sido re-autenticado.`);
    } else {
      // Si no proporciona contraseña, redirigir al login
      window.location.reload();
    }

  } catch (error) {
    console.error('Error:', error);
    setError('Error al crear usuario: ' + error.message);
  } finally {
    setLoading(false);
  }
};

// SOLUCIÓN 4: Usar una instancia secundaria de Firebase (Más complejo)
// Para uso avanzado - requiere configuración adicional

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Crear una segunda instancia de Firebase solo para crear usuarios
const secondaryApp = initializeApp(firebaseConfig, 'secondary');
const secondaryAuth = getAuth(secondaryApp);

const handleCreateUserSecondary = async (userData) => {
  try {
    // Usar la instancia secundaria para crear el usuario
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth, // Usar auth secundario
      userData.email,
      userData.password
    );

    // Crear documento en Firestore
    await addDoc(collection(db, 'users'), {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      active: true,
      created_at: serverTimestamp(),
      uid: userCredential.user.uid
    });

    // Deslogear de la instancia secundaria
    await signOut(secondaryAuth);
    
    setSuccess(`Usuario ${userData.email} creado exitosamente`);
    // El admin principal sigue logueado
    
  } catch (error) {
    console.error('Error:', error);
    setError('Error al crear usuario: ' + error.message);
  }
};
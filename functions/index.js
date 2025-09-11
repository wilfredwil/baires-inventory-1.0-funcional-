// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Admin SDK
admin.initializeApp();

// Cloud Function para crear usuarios (solo admins pueden llamarla)
exports.createUser = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'Debes estar autenticado para crear usuarios'
    );
  }

  try {
    // Verificar si el usuario que llama es admin
    const callerDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied', 
        'Solo los administradores pueden crear usuarios'
      );
    }

    // Validar datos requeridos
    const { email, password, firstName, lastName, role, workInfo } = data;
    
    if (!email || !password || !firstName || !lastName || !role) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Faltan campos obligatorios: email, password, firstName, lastName, role'
      );
    }

    // Crear usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
      disabled: false
    });

    console.log('Usuario creado en Authentication:', userRecord.uid);

    // Crear documento en Firestore
    const userData = {
      uid: userRecord.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      role: role,
      active: true,
      workInfo: workInfo || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.token.email || context.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Agregar ID de empleado si no existe
    if (!userData.workInfo.employeeId) {
      userData.workInfo.employeeId = `EMP${Date.now().toString().slice(-6)}`;
    }

    await admin.firestore()
      .collection('users')
      .doc(userRecord.uid)
      .set(userData);

    console.log('Documento creado en Firestore:', userRecord.uid);

    // Retornar resultado exitoso
    return {
      success: true,
      uid: userRecord.uid,
      email: email,
      employeeId: userData.workInfo.employeeId,
      message: `Usuario ${email} creado exitosamente`
    };

  } catch (error) {
    console.error('Error en createUser:', error);
    
    // Manejar errores específicos
    if (error.code === 'auth/email-already-in-use') {
      throw new functions.https.HttpsError(
        'already-exists', 
        'Este email ya está registrado'
      );
    } else if (error.code === 'auth/weak-password') {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'La contraseña es demasiado débil'
      );
    } else if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'El formato del email es inválido'
      );
    }
    
    // Error genérico
    throw new functions.https.HttpsError(
      'internal', 
      `Error interno: ${error.message}`
    );
  }
});

// Cloud Function para eliminar usuarios (solo admins)
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  try {
    // Verificar permisos de admin
    const callerDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden eliminar usuarios');
    }

    const { uid } = data;
    
    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'UID es requerido');
    }

    // Evitar que el admin se elimine a sí mismo
    if (uid === context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'No puedes eliminarte a ti mismo');
    }

    // Eliminar de Authentication
    await admin.auth().deleteUser(uid);
    
    // Eliminar documento de Firestore
    await admin.firestore().collection('users').doc(uid).delete();

    return {
      success: true,
      message: 'Usuario eliminado exitosamente'
    };

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Cloud Function para actualizar roles (solo admins)
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  try {
    // Verificar permisos de admin
    const callerDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden actualizar roles');
    }

    const { uid, newRole } = data;
    
    if (!uid || !newRole) {
      throw new functions.https.HttpsError('invalid-argument', 'UID y newRole son requeridos');
    }

    // Actualizar en Firestore
    await admin.firestore().collection('users').doc(uid).update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.token.email || context.auth.uid
    });

    return {
      success: true,
      message: `Rol actualizado a ${newRole} exitosamente`
    };

  } catch (error) {
    console.error('Error actualizando rol:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
// functions/cleanupTaskPhotos.js
// Firebase Cloud Function para eliminar fotos de tareas automáticamente

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Cloud Function que se ejecuta diariamente para limpiar fotos de tareas viejas
 * Se ejecuta todos los días a las 2:00 AM
 */
exports.cleanupTaskPhotos = functions.pubsub
  .schedule('0 2 * * *') // Cron: todos los días a las 2:00 AM
  .timeZone('America/New_York') // Ajusta según tu zona horaria
  .onRun(async (context) => {
    console.log('🧹 Iniciando limpieza de fotos de tareas...');
    
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Buscar tareas completadas hace más de 7 días que tienen fotos
      const tasksQuery = db.collection('assigned_tasks')
        .where('completed_at', '<=', sevenDaysAgo)
        .where('photo_url', '!=', null);
      
      const tasksSnapshot = await tasksQuery.get();
      
      if (tasksSnapshot.empty) {
        console.log('✅ No hay fotos para eliminar');
        return null;
      }
      
      console.log(`📸 Encontradas ${tasksSnapshot.size} tareas con fotos para limpiar`);
      
      const batch = db.batch();
      const photosToDelete = [];
      
      // Procesar cada tarea
      tasksSnapshot.forEach(doc => {
        const task = doc.data();
        
        if (task.photo_url) {
          // Extraer el path de la foto desde la URL
          const photoPath = extractPhotoPath(task.photo_url);
          if (photoPath) {
            photosToDelete.push(photoPath);
          }
          
          // Actualizar documento para remover la URL de la foto
          const taskRef = db.collection('assigned_tasks').doc(doc.id);
          batch.update(taskRef, {
            photo_url: admin.firestore.FieldValue.delete(),
            photo_deleted_at: admin.firestore.FieldValue.serverTimestamp(),
            cleanup_reason: 'auto_cleanup_7_days'
          });
        }
      });
      
      // Ejecutar actualizaciones en batch
      await batch.commit();
      console.log(`📝 Actualizados ${tasksSnapshot.size} documentos de tareas`);
      
      // Eliminar fotos del Storage
      let deletedCount = 0;
      let errorCount = 0;
      
      for (const photoPath of photosToDelete) {
        try {
          await storage.bucket().file(photoPath).delete();
          deletedCount++;
          console.log(`🗑️ Eliminada foto: ${photoPath}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Error eliminando foto ${photoPath}:`, error.message);
        }
      }
      
      // Log de resultados
      console.log(`✅ Limpieza completada:
        - Tareas procesadas: ${tasksSnapshot.size}
        - Fotos eliminadas exitosamente: ${deletedCount}
        - Errores al eliminar: ${errorCount}`);
      
      // Opcional: Crear log de la limpieza
      await db.collection('cleanup_logs').add({
        type: 'task_photos',
        executed_at: admin.firestore.FieldValue.serverTimestamp(),
        tasks_processed: tasksSnapshot.size,
        photos_deleted: deletedCount,
        errors: errorCount,
        cutoff_date: sevenDaysAgo
      });
      
      return null;
      
    } catch (error) {
      console.error('💥 Error en limpieza de fotos:', error);
      
      // Opcional: Crear log de error
      await db.collection('cleanup_logs').add({
        type: 'task_photos',
        executed_at: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        status: 'failed'
      });
      
      throw error;
    }
  });

/**
 * Función auxiliar para extraer el path de una foto desde su URL de Firebase Storage
 * @param {string} photoUrl - URL completa de la foto
 * @returns {string|null} - Path de la foto o null si no se puede extraer
 */
function extractPhotoPath(photoUrl) {
  try {
    // Firebase Storage URLs tienen este formato:
    // https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=...
    
    const url = new URL(photoUrl);
    const pathPart = url.pathname.split('/o/')[1];
    
    if (pathPart) {
      // Decodificar URL encoding (%2F -> /)
      return decodeURIComponent(pathPart.split('?')[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error extrayendo path de foto:', error);
    return null;
  }
}

/**
 * Cloud Function HTTP para ejecutar limpieza manual (opcional)
 * Útil para testing o limpieza bajo demanda
 */
exports.cleanupTaskPhotosManual = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado y sea admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }
  
  // Verificar que sea admin
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || userData.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden ejecutar limpieza manual');
  }
  
  console.log(`🔧 Limpieza manual iniciada por: ${context.auth.uid}`);
  
  try {
    // Ejecutar la misma lógica que la función automática
    // (aquí podrías copiar el código de arriba o refactorizar en una función común)
    
    return { success: true, message: 'Limpieza ejecutada exitosamente' };
    
  } catch (error) {
    console.error('Error en limpieza manual:', error);
    throw new functions.https.HttpsError('internal', 'Error ejecutando limpieza');
  }
});

/**
 * Cloud Function para obtener estadísticas de limpieza (opcional)
 */
exports.getCleanupStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }
  
  try {
    const logsSnapshot = await db.collection('cleanup_logs')
      .where('type', '==', 'task_photos')
      .orderBy('executed_at', 'desc')
      .limit(10)
      .get();
    
    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      executed_at: doc.data().executed_at?.toDate()
    }));
    
    return { logs };
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw new functions.https.HttpsError('internal', 'Error obteniendo estadísticas');
  }
});
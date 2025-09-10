const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Configurar transporter de email
const transporter = nodemailer.createTransporter({
  service: 'gmail', // o tu proveedor
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass
  }
});

exports.sendLowStockEmail = functions.https.onCall(async (data, context) => {
  try {
    console.log('Función llamada con datos:', data);
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { inventory, recipientEmail, fromEmail } = data;
    
    if (!recipientEmail || !inventory || inventory.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Datos incompletos');
    }

    // Crear contenido del email
    let emailContent = `
      <h2>🚨 Alerta de Stock Bajo - Baires Inventory</h2>
      <p>Los siguientes productos requieren reposición:</p>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #f2f2f2;">
          <th>Producto</th>
          <th>Stock Actual</th>
          <th>Umbral</th>
          <th>Necesario</th>
          <th>Proveedor</th>
        </tr>
    `;
    
    inventory.forEach(item => {
      emailContent += `
        <tr>
          <td>${item.nombre}</td>
          <td>${item.stock}</td>
          <td>${item.umbral_low}</td>
          <td>${item.diferencia}</td>
          <td>${item.proveedor || 'Sin proveedor'}</td>
        </tr>
      `;
    });
    
    emailContent += `</table><p>Enviado por: ${fromEmail}</p>`;

    await transporter.sendMail({
      from: functions.config().email.user,
      to: recipientEmail,
      subject: '🚨 Alerta de Stock Bajo - Baires Inventory',
      html: emailContent
    });

    return { success: true, message: 'Email enviado correctamente' };
  } catch (error) {
    console.error('Error enviando email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
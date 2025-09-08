const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "willdelpozodj@gmail.com", // Reemplaza con tu email
    pass: "bplv urww tcro kkei" // Reemplaza con tu app password
  },
  tls: {
    rejectUnauthorized: false // Temporal para evitar problemas de certificados
  }
});

const cleanName = (name) => {
  return (name || 'Sin nombre').trim().replace(/[^\w\s-']/g, '').replace(/\s+/g, ' ');
};

const debugEmail = (report) => {
  console.log("Contenido del email (raw):", report);
  return report;
};

transporter.verify((error, success) => {
  if (error) {
    console.error("Error verificando transporter:", error);
  } else {
    console.log("Transporter configurado correctamente");
  }
});

exports.sendLowStockEmail = onCall(async (request) => {
  try {
    const { inventory, recipientEmail, fromEmail } = request.data;
    if (!inventory || !Array.isArray(inventory) || !recipientEmail || !fromEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Datos de inventario, remitente o destinatario no proporcionados.');
    }

    let report = "<html><body><h2>Pedido de Inventario - Baires Inventory</h2><hr>";
    let licores = inventory.filter(item => item.tipo === 'licor');
    let vinos = inventory.filter(item => item.tipo === 'vino');
    let cervezas = inventory.filter(item => item.tipo === 'cerveza');

    if (licores.length > 0) {
      report += "<h3 style='color: blue;'>Licores a Pedir</h3><table border='1' cellpadding='5'><tr><th>Nombre</th><th>Cantidad</th></tr>";
      licores.forEach(item => {
        report += `<tr><td>${cleanName(item.nombre)}</td><td>${item.stock || 0} unidades</td></tr>`;
      });
      report += "</table><br>";
    }
    if (vinos.length > 0) {
      report += "<h3 style='color: green;'>Vinos a Pedir</h3><table border='1' cellpadding='5'><tr><th>Nombre (Bodega)</th><th>Cantidad</th></tr>";
      vinos.forEach(item => {
        report += `<tr><td>${cleanName(item.nombre)} (${cleanName(item.marca) || 'Sin bodega'})</td><td>${item.stock || 0} unidades</td></tr>`;
      });
      report += "</table><br>";
    }
    if (cervezas.length > 0) {
      report += "<h3 style='color: orange;'>Cervezas a Pedir</h3><table border='1' cellpadding='5'><tr><th>Nombre</th><th>Cantidad</th></tr>";
      cervezas.forEach(item => {
        report += `<tr><td>${cleanName(item.nombre)}</td><td>${item.stock || 0} unidades</td></tr>`;
      });
      report += "</table>";
    }

    report += "</body></html>";
    report = debugEmail(report);
    console.log("Intentando enviar email a:", recipientEmail, "desde:", fromEmail);

    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) reject(error);
        else resolve(success);
      });
    });

    const info = await transporter.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject: "Pedido de Inventario - Baires Inventory",
      html: report,
      text: report.replace(/<[^>]+>/g, ''),
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
    console.log("Email enviado:", info.response);
    return { success: true, message: `Email enviado exitosamente a ${recipientEmail}` };
  } catch (error) {
    console.error("Error completo en sendLowStockEmail:", error);
    if (error.code === 'EAUTH') {
      throw new functions.https.HttpsError('invalid-argument', 'Error de autenticación con Gmail. Verifica las credenciales.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new functions.https.HttpsError('unavailable', 'No se pudo conectar al servidor de correo.');
    }
    throw new functions.https.HttpsError('internal', 'Error enviando email: ' + error.message);
  }
});
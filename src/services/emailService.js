const nodemailer = require('nodemailer');

// Configurar transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Enviar credenciales de Rasi Assistant
 */
async function sendAssistantCredentials(data) {
  try {
    const { email, fullName, username, password, url } = data;

    console.log('📧 Enviando credenciales de Rasi Assistant a:', email);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🎉 ¡Bienvenido(a) a Rasi! Tu acceso ya está listo 🚀',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.8;
              color: #333;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 650px;
              margin: 30px auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #667eea;
              font-size: 24px;
              margin-bottom: 10px;
            }
            .credentials-box {
              background: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 25px 0;
            }
            .credential-item {
              margin: 12px 0;
              font-size: 15px;
            }
            .credential-label {
              font-weight: bold;
              color: #667eea;
            }
            .credential-value {
              font-family: monospace;
              color: #333;
              background: white;
              padding: 8px 12px;
              border-radius: 5px;
              display: inline-block;
              margin-left: 10px;
            }
            .benefits {
              margin: 25px 0;
              padding-left: 20px;
            }
            .benefits li {
              margin: 10px 0;
              list-style: none;
            }
            .contact-box {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 20px;
              margin: 25px 0;
              border-radius: 8px;
            }
            .schedule {
              margin: 15px 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Bienvenido(a) a Rasi! Tu acceso ya está listo 🚀</h1>
            </div>

            <p>Hola, <strong>${fullName}</strong>:</p>

            <p>¡Gracias por confiar en Rasi! 🎉</p>

            <p>Tu compra se ha completado con éxito y estás listo(a) para empezar a disfrutar de una plataforma creada para ayudarte a trabajar de forma más ágil, inteligente y eficiente.</p>

            <p><strong>A continuación encontrarás tus credenciales de acceso:</strong></p>

            <div class="credentials-box">
              <p style="margin-top: 0;"><strong>🔗 Acceso a la plataforma RASI ASSISTANT:</strong></p>
              <p><strong>👉</strong> <a href="${url}" style="color: #667eea; text-decoration: none;">${url}</a></p>

              <div class="credential-item">
                <span class="credential-label">🔑 Usuario:</span>
                <span class="credential-value">${username}</span>
              </div>

              <div class="credential-item">
                <span class="credential-label">🔐 Contraseña:</span>
                <span class="credential-value">${password}</span>
              </div>

              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                <strong>📌 Por seguridad, evita compartir tus credenciales y mantén tu información confidencial.</strong>
              </p>
            </div>

            <p><strong>Desde ahora podrás aprovechar:</strong></p>
            <ul class="benefits">
              <li>✨ Atención instantánea con IA</li>
              <li>✨ Procesos automatizados</li>
              <li>✨ Información centralizada</li>
              <li>✨ Soporte cuando lo necesites</li>
            </ul>

            <p>Si necesitas acompañamiento en tu primer inicio de sesión o soporte técnico, estamos para ayudarte dentro de nuestro horario de atención:</p>

            <div class="contact-box">
              <p style="margin: 0 0 15px 0;"><strong>🕒 Horario de atención:</strong></p>
              <div class="schedule">
                <p style="margin: 5px 0;"><strong>Lunes a jueves:</strong> 7:00 a.m. – 12:00 m / 2:00 p.m. – 6:00 p.m.</p>
                <p style="margin: 5px 0;"><strong>Viernes:</strong> 7:00 a.m. – 12:00 m / 2:00 p.m. – 5:00 p.m.</p>
              </div>
            </div>

            <p style="margin-top: 30px;">Bienvenido(a) a una nueva experiencia digital con Rasi Soluciones.</p>
            <p><strong>✨ ¡El futuro de tu empresa empieza hoy! 🚀</strong></p>

            <div class="footer">
              <p><strong>Cordialmente,</strong></p>
              <p>Equipo Rasi Soluciones</p>
              <p style="margin-top: 20px;">&copy; 2025 Rasi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email de credenciales enviado exitosamente');

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

/**
 * Enviar confirmación de compra de Rasi Autocitas
 */
async function sendAutocitasConfirmation(data) {
  try {
    const { email, fullName } = data;

    console.log('📧 Enviando confirmación de Rasi Autocitas a:', email);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '✅ ¡Pago confirmado! Continuemos con la parametrización de tu Rasi Autocitas',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.8;
              color: #333;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 650px;
              margin: 30px auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #10b981;
              font-size: 24px;
              margin-bottom: 10px;
            }
            .contact-box {
              background: #e8f5e9;
              border-left: 4px solid #10b981;
              padding: 20px;
              margin: 25px 0;
              border-radius: 8px;
            }
            .schedule {
              margin: 15px 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ ¡Pago confirmado! Continuemos con la parametrización de tu Rasi Autocitas</h1>
            </div>

            <p>Hola, <strong>${fullName}</strong>:</p>

            <p>¡Gracias por tu compra! Hemos recibido correctamente tu pago y ahora estamos listos para avanzar al siguiente paso: la parametrización de tu <strong>Rasi Autocitas</strong>, un proceso clave para garantizar que la solución quede totalmente adaptada a tu empresa.</p>

            <p>Para continuar, te invitamos a comunicarte con nosotros para brindarte el acompañamiento necesario y coordinar el inicio del proceso.</p>

            <div class="contact-box">
              <p style="margin: 0 0 15px 0;"><strong>📞 Contáctanos para iniciar tu parametrización:</strong></p>
              <p style="margin: 5px 0;"><strong>WhatsApp:</strong> 3202306105</p>
              <p style="margin: 5px 0;"><strong>Correo:</strong> administracion@rasi.com.co</p>

              <hr style="margin: 20px 0; border: none; border-top: 1px solid #c8e6c9;">

              <p style="margin: 10px 0 5px 0;"><strong>🕒 Horario de atención:</strong></p>
              <div class="schedule">
                <p style="margin: 5px 0;"><strong>Lunes a jueves:</strong> 7:00 a.m. – 12:00 p.m. y 2:00 p.m. – 6:00 p.m.</p>
                <p style="margin: 5px 0;"><strong>Viernes:</strong> 7:00 a.m. – 12:00 p.m. y 2:00 p.m. – 5:00 p.m.</p>
              </div>
            </div>

            <p style="margin-top: 30px;">Tu experiencia con Rasi inicia ahora, y estaremos contigo en cada paso para asegurar que tu implementación sea rápida, sencilla y exitosa.</p>

            <p>Gracias por confiar en Rasi Soluciones.</p>
            <p><strong>🚀 ¡Vamos a configurar el futuro digital de tu empresa!</strong></p>

            <div class="footer">
              <p><strong>Cordialmente,</strong></p>
              <p>Equipo Rasi Soluciones</p>
              <p style="margin-top: 20px;">&copy; 2025 Rasi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmación enviado exitosamente');

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

/**
 * Enviar email de confirmación para Rasi Chatbot
 */
async function sendChatbotConfirmation(data) {
  try {
    const { email, fullName } = data;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '✅ ¡Pago confirmado! Continuemos con la parametrización de tu Rasi Chatbot',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.8;
              color: #333;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 650px;
              margin: 30px auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #007bff;
              font-size: 24px;
              margin-bottom: 10px;
            }
            .contact-box {
              background: #e3f2fd;
              border-left: 4px solid #007bff;
              padding: 20px;
              margin: 25px 0;
              border-radius: 8px;
            }
            .schedule {
              margin: 15px 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ ¡Pago confirmado! Continuemos con la parametrización de tu Rasi Chatbot</h1>
            </div>

            <p>Hola, <strong>${fullName}</strong>:</p>

            <p>¡Gracias por tu compra! Hemos recibido correctamente tu pago y ahora estamos listos para avanzar al siguiente paso: la parametrización de tu <strong>Rasi Chatbot</strong>, un proceso clave para garantizar que la solución quede totalmente adaptada a tu empresa.</p>

            <p>Para continuar, te invitamos a comunicarte con nosotros para brindarte el acompañamiento necesario y coordinar el inicio del proceso.</p>

            <div class="contact-box">
              <p style="margin: 0 0 15px 0;"><strong>📞 Contáctanos para iniciar tu parametrización:</strong></p>
              <p style="margin: 5px 0;"><strong>WhatsApp:</strong> 3202306105</p>
              <p style="margin: 5px 0;"><strong>Correo:</strong> administracion@rasi.com.co</p>

              <hr style="margin: 20px 0; border: none; border-top: 1px solid #bbdefb;">

              <p style="margin: 10px 0 5px 0;"><strong>🕒 Horario de atención:</strong></p>
              <div class="schedule">
                <p style="margin: 5px 0;"><strong>Lunes a jueves:</strong> 7:00 a.m. – 12:00 p.m. y 2:00 p.m. – 6:00 p.m.</p>
                <p style="margin: 5px 0;"><strong>Viernes:</strong> 7:00 a.m. – 12:00 p.m. y 2:00 p.m. – 5:00 p.m.</p>
              </div>
            </div>

            <p style="margin-top: 30px;">Tu experiencia con Rasi inicia ahora, y estaremos contigo en cada paso para asegurar que tu implementación sea rápida, sencilla y exitosa.</p>

            <p>Gracias por confiar en Rasi Soluciones.</p>
            <p><strong>🚀 ¡Vamos a configurar el futuro digital de tu empresa!</strong></p>

            <div class="footer">
              <p><strong>Cordialmente,</strong></p>
              <p>Equipo Rasi Soluciones</p>
              <p style="margin-top: 20px;">&copy; 2025 Rasi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📧 Enviando email de confirmación de Rasi Chatbot a:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmación de Chatbot enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error enviando email de Chatbot:', error);
    throw error;
  }
}


/**
 * Enviar mensaje del formulario de contacto
 */
async function sendContactForm(data) {
  try {
    const { name, phone, email, subject, message } = data;

    console.log('📧 Enviando mensaje de contacto desde:', email);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: 'comercial@rasi.com.co',
      replyTo: email,
      subject: `📩 Nuevo mensaje de contacto: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 30px auto;
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #06b6d4 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 25px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .info-section {
              background: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
            }
            .info-item {
              margin: 10px 0;
              font-size: 15px;
            }
            .label {
              font-weight: bold;
              color: #667eea;
              display: inline-block;
              width: 100px;
            }
            .message-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #e9ecef;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 Nuevo Mensaje de Contacto</h1>
            </div>

            <p>Has recibido un nuevo mensaje desde el formulario de contacto de la página web.</p>

            <div class="info-section">
              <div class="info-item">
                <span class="label">👤 Nombre:</span>
                <span>${name}</span>
              </div>
              <div class="info-item">
                <span class="label">📧 Email:</span>
                <span>${email}</span>
              </div>
              <div class="info-item">
                <span class="label">📱 Teléfono:</span>
                <span>${phone}</span>
              </div>
              <div class="info-item">
                <span class="label">📝 Asunto:</span>
                <span>${subject}</span>
              </div>
            </div>

            <div class="message-box">
              <h3 style="margin-top: 0; color: #667eea;">💬 Mensaje:</h3>
              <p style="white-space: pre-line; margin: 0;">${message}</p>
            </div>

            <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
              <strong>⚡ Acción requerida:</strong> Por favor responde a este mensaje lo antes posible para mantener una buena experiencia con el cliente.
            </p>

            <div class="footer">
              <p><strong>Sistema de Contacto Web</strong></p>
              <p>Rasi Soluciones</p>
              <p style="margin-top: 15px;">&copy; 2025 Rasi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email de contacto enviado exitosamente a comercial@rasi.com.co');

  } catch (error) {
    console.error('❌ Error enviando email de contacto:', error);
    throw error;
  }
}

module.exports = {
  sendAssistantCredentials,
  sendAutocitasConfirmation,
  sendChatbotConfirmation,
  sendContactForm
};

const express = require('express');
const router = express.Router();
const { sendContactForm } = require('../services/emailService');

/**
 * POST /api/contact
 * Endpoint para recibir mensajes del formulario de contacto
 */
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, subject, message, consent } = req.body;

    // Validación de campos requeridos
    if (!name || !phone || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Validación de consentimiento
    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Debes aceptar la política de tratamiento de datos'
      });
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    console.log('📬 Nuevo mensaje de contacto recibido:', { name, email, subject });

    // Enviar email
    await sendContactForm({
      name,
      phone,
      email,
      subject,
      message
    });

    res.status(200).json({
      success: true,
      message: 'Mensaje enviado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error procesando formulario de contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el mensaje. Por favor intenta de nuevo.'
    });
  }
});

module.exports = router;

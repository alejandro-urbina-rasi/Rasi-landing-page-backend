const axios = require('axios');

/**
 * Servicio para registrar usuarios en la API del SaaS (Rasi Assistant)
 * Solo se ejecuta después de un pago exitoso
 */

const SAAS_API_URL = process.env.SAAS_API_URL || 'http://localhost:5000';

/**
 * Registrar un nuevo usuario y empresa en el SaaS
 * @param {Object} registrationData - Datos del formulario de registro
 * @returns {Promise<Object>} - Credenciales generadas
 */
async function registerUserInSaaS(registrationData) {
  try {
    // 🛡️ Validar que registrationData existe
    if (!registrationData) {
      throw new Error('registrationData es undefined o null');
    }

    const {
      nombreEmpresa,
      nit,
      representanteLegal,
      correoUsuario,
      nombreUsuario,
      documentoUsuario,
      passwordUsuario
    } = registrationData;

    // 🛡️ Validar campos requeridos
    const requiredFields = {
      nombreEmpresa,
      nit,
      representanteLegal,
      correoUsuario,
      nombreUsuario,
      documentoUsuario,
      passwordUsuario
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
    }

    console.log('📤 Registrando usuario en SaaS:', {
      empresa: nombreEmpresa,
      usuario: correoUsuario
    });

    // Payload según el formato esperado por la API del SaaS
    const payload = {
      // Empresa
      nombre_empresa: nombreEmpresa,
      nit,
      representante_legal: representanteLegal,
      // Usuario
      correo: correoUsuario,
      nombre_usuario: nombreUsuario,
      documento: documentoUsuario,
      password: passwordUsuario,
      confirmar_password: passwordUsuario // La validación ya se hizo en el frontend
    };

    // Hacer petición a la API de registro
    const response = await axios.post(
      `${SAAS_API_URL}/api/auth/registro-publico`,
      payload,
      {
        timeout: 15000, // 15 segundos timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Registro exitoso en SaaS');

    return {
      success: true,
      credentials: {
        email: response.data.credenciales.email_usuario,
        password: response.data.credenciales.password_usuario,
        url: process.env.SAAS_FRONTEND_URL || SAAS_API_URL
      },
      usuario: response.data.usuario,
      empresa: response.data.empresa,
      token: response.data.token
    };

  } catch (error) {
    console.error('❌ Error al registrar usuario en SaaS:', error.message);

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }

    throw new Error(`Error en registro SaaS: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Verificar si la API del SaaS está disponible
 * @returns {Promise<Boolean>}
 */
async function checkSaaSApiHealth() {
  try {
    await axios.get(`${SAAS_API_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.warn('⚠️  SaaS API no disponible:', SAAS_API_URL);
    return false;
  }
}

module.exports = {
  registerUserInSaaS,
  checkSaaSApiHealth,
  SAAS_API_URL
};

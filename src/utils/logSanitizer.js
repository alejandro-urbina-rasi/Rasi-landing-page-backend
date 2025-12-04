/**
 * Utilidades para sanitizar información sensible en logs
 *
 * IMPORTANTE: Nunca loguear información completa de:
 * - Emails
 * - Teléfonos
 * - Tarjetas de crédito
 * - Contraseñas
 * - Tokens
 * - Firmas criptográficas
 * - Datos personales completos
 */

/**
 * Sanitiza un email para logs
 * Muestra solo los últimos 10 caracteres
 * @param {string} email - Email a sanitizar
 * @returns {string} Email sanitizado
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'N/A';
  }

  if (email.length <= 10) {
    return '***' + email.slice(-3);
  }

  return '***' + email.slice(-10);
}

/**
 * Sanitiza un número de teléfono para logs
 * Muestra solo los últimos 4 dígitos
 * @param {string} phone - Teléfono a sanitizar
 * @returns {string} Teléfono sanitizado
 */
function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return 'N/A';
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '***' + digits;
  }

  return '***' + digits.slice(-4);
}

/**
 * Sanitiza un nombre completo para logs
 * Muestra solo las iniciales
 * @param {string} fullName - Nombre completo a sanitizar
 * @returns {string} Nombre sanitizado
 */
function sanitizeName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return 'N/A';
  }

  const names = fullName.trim().split(/\s+/);
  if (names.length === 0) {
    return 'N/A';
  }

  // Tomar primera letra de cada nombre
  const initials = names.map(name => name[0].toUpperCase()).join('.');
  return initials + '.';
}

/**
 * Sanitiza un token o clave API
 * Muestra solo los primeros y últimos 4 caracteres
 * @param {string} token - Token a sanitizar
 * @returns {string} Token sanitizado
 */
function sanitizeToken(token) {
  if (!token || typeof token !== 'string') {
    return 'N/A';
  }

  if (token.length <= 8) {
    return '***';
  }

  return token.slice(0, 4) + '...' + token.slice(-4);
}

/**
 * Sanitiza un número de tarjeta de crédito
 * Muestra solo los últimos 4 dígitos
 * @param {string} cardNumber - Número de tarjeta
 * @returns {string} Número sanitizado
 */
function sanitizeCardNumber(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return 'N/A';
  }

  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '****';
  }

  return '**** **** **** ' + digits.slice(-4);
}

/**
 * Sanitiza un objeto para logs, ocultando campos sensibles
 * @param {Object} obj - Objeto a sanitizar
 * @param {Array<string>} sensitiveFields - Campos considerados sensibles
 * @returns {Object} Objeto sanitizado
 */
function sanitizeObject(obj, sensitiveFields = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Campos sensibles por defecto
  const defaultSensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key',
    'signature',
    'x_signature',
    'credit_card',
    'card_number',
    'cvv',
    'ssn',
    'tax_id'
  ];

  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];

  const sanitized = { ...obj };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();

    // Verificar si el campo es sensible
    if (allSensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '***';
    }
    // Sanitizar emails
    else if (lowerKey.includes('email') && typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeEmail(sanitized[key]);
    }
    // Sanitizar teléfonos
    else if ((lowerKey.includes('phone') || lowerKey.includes('movil') || lowerKey.includes('mobile'))
             && typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizePhone(sanitized[key]);
    }
    // Sanitizar nombres
    else if ((lowerKey.includes('name') || lowerKey === 'fullname') && typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeName(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Crea un logger seguro que sanitiza automáticamente datos sensibles
 * @param {string} context - Contexto del log (ej: 'PaymentController')
 * @returns {Object} Logger con métodos log, error, warn
 */
function createSafeLogger(context) {
  const prefix = context ? `[${context}]` : '';

  return {
    log: (...args) => {
      const sanitizedArgs = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.log(prefix, ...sanitizedArgs);
    },

    error: (...args) => {
      const sanitizedArgs = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.error(prefix, ...sanitizedArgs);
    },

    warn: (...args) => {
      const sanitizedArgs = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.warn(prefix, ...sanitizedArgs);
    }
  };
}

module.exports = {
  sanitizeEmail,
  sanitizePhone,
  sanitizeName,
  sanitizeToken,
  sanitizeCardNumber,
  sanitizeObject,
  createSafeLogger
};

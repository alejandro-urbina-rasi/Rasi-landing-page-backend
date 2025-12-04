/**
 * Middleware para validar que las peticiones al webhook
 * provengan de direcciones IP autorizadas de ePayco
 *
 * Documentación oficial de ePayco:
 * https://docs.epayco.co/payments/webhooks#ips-autorizadas
 */

// IPs oficiales de ePayco para webhooks
// ⚠️ IMPORTANTE: Consultar la lista actualizada en la documentación oficial
// https://docs.epayco.co/payments/webhooks#ips-autorizadas
const EPAYCO_AUTHORIZED_IPS = [
  '181.49.176.18',  // ePayco Producción
  '181.49.176.19',  // ePayco Producción
  '181.49.50.0',    // ePayco Backup
  '190.131.241.0',  // ePayco Red 2
  // Agregar más IPs según documentación actualizada de ePayco
];

// IPs locales permitidas solo en desarrollo
const DEVELOPMENT_IPS = [
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  'localhost'
];

/**
 * Extrae la IP real del cliente considerando proxies
 * @param {Object} req - Request de Express
 * @returns {string} IP del cliente
 */
function getClientIP(req) {
  // Intentar obtener IP de headers de proxy
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for puede contener múltiples IPs, tomar la primera
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }

  // Fallback a IP de conexión directa
  return req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.connection.socket?.remoteAddress ||
         'unknown';
}

/**
 * Normaliza IPv6 a IPv4 cuando sea posible
 * @param {string} ip - Dirección IP
 * @returns {string} IP normalizada
 */
function normalizeIP(ip) {
  // Convertir ::ffff:192.168.1.1 a 192.168.1.1
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Valida si una IP está autorizada
 * @param {string} clientIP - IP del cliente
 * @param {boolean} isDevelopment - Si está en modo desarrollo
 * @returns {boolean} true si la IP está autorizada
 */
function isIPAuthorized(clientIP, isDevelopment = false) {
  const normalizedIP = normalizeIP(clientIP);

  // En desarrollo, permitir IPs locales
  if (isDevelopment && DEVELOPMENT_IPS.includes(normalizedIP)) {
    return true;
  }

  // Verificar contra IPs autorizadas de ePayco
  return EPAYCO_AUTHORIZED_IPS.some(authorizedIP => {
    // Soporte para rangos CIDR si es necesario
    // Por ahora, comparación exacta
    return normalizedIP === authorizedIP || normalizedIP.startsWith(authorizedIP);
  });
}

/**
 * Middleware de Express para validar IP de ePayco
 */
function validateEpaycoIP(req, res, next) {
  const clientIP = getClientIP(req);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isEnabled = process.env.VALIDATE_IP !== 'false'; // Habilitado por defecto

  console.log('🔍 Validando IP de webhook:');
  console.log('   IP del cliente:', clientIP);
  console.log('   Modo:', isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN');

  // Permitir desactivar validación con variable de entorno
  if (!isEnabled) {
    console.warn('⚠️  VALIDACIÓN DE IP DESHABILITADA');
    return next();
  }

  // Validar IP
  if (isIPAuthorized(clientIP, isDevelopment)) {
    console.log('✅ IP autorizada');
    return next();
  }

  // IP no autorizada
  console.error('🚨 IP NO AUTORIZADA INTENTANDO ACCEDER AL WEBHOOK');
  console.error('   IP bloqueada:', clientIP);
  console.error('   User-Agent:', req.headers['user-agent']);
  console.error('   Timestamp:', new Date().toISOString());

  // Registrar intento sospechoso
  logSuspiciousIPAttempt(req, clientIP);

  // En desarrollo, solo advertir pero permitir
  if (isDevelopment) {
    console.warn('⚠️  MODO DESARROLLO: Permitiendo acceso de IP no autorizada');
    return next();
  }

  // En producción, bloquear
  return res.status(403).json({
    error: 'Forbidden',
    message: 'IP not authorized'
  });
}

/**
 * Registra intentos de acceso desde IPs no autorizadas
 * @param {Object} req - Request de Express
 * @param {string} clientIP - IP del cliente
 */
function logSuspiciousIPAttempt(req, clientIP) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: clientIP,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'referer': req.headers['referer']
    },
    body: req.body ? Object.keys(req.body) : [],
    severity: 'HIGH'
  };

  console.error('📋 INTENTO SOSPECHOSO DE ACCESO AL WEBHOOK:');
  console.error(JSON.stringify(logEntry, null, 2));

  // TODO: En producción, enviar alerta al equipo de seguridad
  // TODO: Considerar bloqueo automático temporal de la IP
  // TODO: Integrar con sistema de detección de intrusiones

  return logEntry;
}

/**
 * Lista las IPs autorizadas (para debugging)
 * @returns {Array} Lista de IPs autorizadas
 */
function getAuthorizedIPs() {
  return [...EPAYCO_AUTHORIZED_IPS];
}

module.exports = {
  validateEpaycoIP,
  getAuthorizedIPs,
  isIPAuthorized,
  getClientIP,
  EPAYCO_AUTHORIZED_IPS
};

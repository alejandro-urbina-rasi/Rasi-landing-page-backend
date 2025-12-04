/**
 * Rate Limiting Middleware
 * Protege contra ataques de fuerza bruta, DDoS y abuso de endpoints
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter para creación de sesiones de pago
 *
 * Previene:
 * - Abuso del endpoint de crear sesiones
 * - Intentos de fraude automatizados
 * - Sobrecarga del servidor
 *
 * Límites:
 * - 10 intentos por IP cada 15 minutos
 * - En producción, considera 5 intentos
 */
const createSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 10, // Más restrictivo en producción
  message: {
    error: 'Demasiados intentos de crear sesión de pago',
    message: 'Por favor intenta nuevamente en 15 minutos',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Retorna info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`

  // Limitar por IP (express-rate-limit maneja IPv4/IPv6 automáticamente)
  // Si necesitas combinar con email, usa un store externo (Redis)

  // Handler cuando se excede el límite
  handler: (req, res) => {
    console.warn('🚨 RATE LIMIT EXCEDIDO - Crear Sesión');
    console.warn('   IP:', req.ip);
    console.warn('   Email:', req.body?.email);
    console.warn('   User-Agent:', req.headers['user-agent']);

    // Registrar para análisis de seguridad
    logRateLimitExceeded('CREATE_SESSION', req);

    res.status(429).json({
      success: false,
      error: 'Demasiados intentos de crear sesión de pago',
      message: 'Por favor intenta nuevamente en 15 minutos',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // Segundos hasta reset
    });
  },

  // Skip en desarrollo local si es necesario
  skip: (req) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      console.warn('⚠️  Rate limiting DESHABILITADO');
      return true;
    }
    return false;
  }
});

/**
 * Rate limiter para webhooks de ePayco
 *
 * Más permisivo que otros endpoints porque ePayco puede enviar
 * múltiples webhooks (reintentos automáticos)
 *
 * Límites:
 * - 100 webhooks por IP cada 15 minutos
 * - Suficiente para operación normal pero previene spam
 */
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Permisivo para reintentos de ePayco
  message: {
    error: 'Demasiadas peticiones al webhook',
    code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    console.error('🚨 RATE LIMIT EXCEDIDO - Webhook');
    console.error('   IP:', req.ip);
    console.error('   Transaction ID:', req.body?.x_transaction_id);

    logRateLimitExceeded('WEBHOOK', req);

    // Retornar 200 para no romper flujo de ePayco
    // pero registrar como sospechoso
    res.status(200).json({
      success: false,
      message: 'Rate limit exceeded'
    });
  },

  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true'
});

/**
 * Rate limiter general para endpoints públicos
 *
 * Aplica a:
 * - Listado de servicios
 * - Verificación de pagos
 * - Otros endpoints públicos
 *
 * Límites:
 * - 60 requests por IP cada minuto
 */
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto = 1 por segundo
  message: {
    error: 'Demasiadas peticiones',
    message: 'Por favor espera un momento antes de intentar nuevamente',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    console.warn('⚠️  Rate limit excedido - Endpoint general');
    console.warn('   IP:', req.ip);
    console.warn('   Path:', req.path);

    logRateLimitExceeded('GENERAL', req);

    res.status(429).json({
      success: false,
      error: 'Demasiadas peticiones',
      message: 'Por favor espera un momento antes de intentar nuevamente',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },

  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true'
});

/**
 * Rate limiter estricto para endpoints sensibles
 *
 * Usado para operaciones críticas que no deberían repetirse frecuentemente
 *
 * Límites:
 * - 3 intentos por IP cada 15 minutos
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Solo 3 intentos
  message: {
    error: 'Demasiados intentos',
    message: 'Has excedido el límite de intentos. Intenta en 15 minutos',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    console.error('🚨 RATE LIMIT ESTRICTO EXCEDIDO');
    console.error('   IP:', req.ip);
    console.error('   Path:', req.path);
    console.error('   Method:', req.method);

    // Alerta de seguridad - podría ser ataque
    logRateLimitExceeded('STRICT', req, 'HIGH');

    res.status(429).json({
      success: false,
      error: 'Demasiados intentos',
      message: 'Has excedido el límite de intentos. Intenta en 15 minutos',
      code: 'STRICT_RATE_LIMIT_EXCEEDED'
    });
  },

  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true'
});

/**
 * Registra eventos de rate limit excedido para análisis
 *
 * @param {string} type - Tipo de rate limit
 * @param {Object} req - Request de Express
 * @param {string} severity - Nivel de severidad (LOW, MEDIUM, HIGH)
 */
function logRateLimitExceeded(type, req, severity = 'MEDIUM') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'RATE_LIMIT_EXCEEDED',
    limiterType: type,
    severity,
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    body: req.body ? {
      email: req.body.email,
      serviceId: req.body.serviceId,
      transactionId: req.body.x_transaction_id
    } : {},
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    }
  };

  console.warn('📋 RATE LIMIT LOG:');
  console.warn(JSON.stringify(logEntry, null, 2));

  // TODO: En producción, enviar a sistema de monitoreo
  // TODO: Considerar bloqueo temporal de IP después de N violaciones
  // TODO: Integrar con sistema de alertas si severity === 'HIGH'

  return logEntry;
}

/**
 * Middleware para agregar headers informativos de rate limit
 * Útil para debugging y para que el cliente sepa sus límites
 */
function addRateLimitInfo(req, res, next) {
  // Esta info se agrega automáticamente por express-rate-limit
  // pero podemos agregar headers customizados si necesitamos
  res.setHeader('X-RateLimit-Policy', 'See docs at /api/rate-limit-info');
  next();
}

module.exports = {
  createSessionLimiter,
  webhookLimiter,
  generalLimiter,
  strictLimiter,
  addRateLimitInfo
};

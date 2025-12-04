const express = require('express');
const paymentController = require('../controllers/paymentController');
const { validateEpaycoIP } = require('../middleware/validateEpaycoIP');
const {
  createSessionLimiter,
  webhookLimiter,
  generalLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * GET /api/payment/services
 * Obtener todos los servicios disponibles
 * Rate limit: 60 requests/minuto
 */
router.get('/services', generalLimiter, paymentController.getServices);

/**
 * GET /api/payment/services/:serviceId
 * Obtener un servicio específico
 * Rate limit: 60 requests/minuto
 */
router.get('/services/:serviceId', generalLimiter, paymentController.getService);

/**
 * POST /api/payment/create-session
 * Crear sesión de pago para servicios Rasi
 *
 * 🔐 SEGURIDAD:
 *    - Rate limit: 10 intentos/15min (5 en producción)
 *    - Verifica que el servicio exista
 *    - Valida que el precio sea correcto
 *    - Compara precio enviado vs precio en backend
 *    - Rechaza si no coinciden (protección contra fraude)
 */
router.post('/create-session', createSessionLimiter, paymentController.createSession);

/**
 * POST /api/payment/webhooks/epayco
 * Webhook para confirmaciones de pago
 *
 * 🔐 SEGURIDAD (aplicada en orden):
 *    1. Rate limit: 100 webhooks/15min (permite reintentos de ePayco)
 *    2. Valida IP de origen (solo ePayco autorizado)
 *    3. Valida firma SHA-256 del webhook (en el controller)
 */
router.post('/webhooks/epayco', webhookLimiter, validateEpaycoIP, paymentController.handlePaymentConfirmation);

/**
 * GET /api/payment/verify/:refOrTransactionId
 * Verificar estado de un pago
 * Rate limit: 60 requests/minuto
 */
router.get('/verify/:refOrTransactionId', generalLimiter, paymentController.verifyPayment);

/**
 * GET /api/payment/payment-response
 * Página de respuesta después del pago (ruta alternativa, aunque se usa la global también)
 */
router.get('/payment-response', paymentController.paymentResponse);

/**
 * ============================================
 * ENDPOINTS DE ADMINISTRACIÓN Y MONITOREO
 * ============================================
 *
 * 🔐 IMPORTANTE: En producción, proteger estos endpoints con:
 *    - Middleware de autenticación de admin
 *    - Rate limiting estricto
 *    - Registro de auditoría de accesos
 */

/**
 * GET /api/payment/admin/compensation/stats
 * Obtener estadísticas de compensaciones pendientes
 *
 * TODO: Agregar middleware de autenticación de admin
 */
router.get('/admin/compensation/stats', generalLimiter, paymentController.getCompensationStats);

/**
 * GET /api/payment/admin/compensation/report
 * Generar reporte completo de compensaciones
 *
 * TODO: Agregar middleware de autenticación de admin
 */
router.get('/admin/compensation/report', generalLimiter, paymentController.getCompensationReport);

/**
 * POST /api/payment/admin/compensation/resolve
 * Marcar una compensación como resuelta manualmente
 *
 * TODO: Agregar middleware de autenticación de admin
 */
router.post('/admin/compensation/resolve', generalLimiter, paymentController.resolveCompensation);

module.exports = router;
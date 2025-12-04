const crypto = require('crypto');

/**
 * Valida la firma de un webhook de ePayco
 *
 * Documentación oficial:
 * https://docs.epayco.co/payments/webhooks#validacion-de-firma
 *
 * @param {Object} webhookData - Datos del webhook
 * @param {string} privateKey - Private Key de ePayco
 * @returns {boolean} true si la firma es válida
 */
function validateEpaycoSignature(webhookData, privateKey) {
  try {
    const {
      x_cust_id_cliente,
      x_ref_payco,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_signature
    } = webhookData;

    // Validar que todos los campos necesarios estén presentes
    if (!x_cust_id_cliente || !x_ref_payco || !x_transaction_id ||
        !x_amount || !x_currency_code || !x_signature) {
      console.error('❌ Faltan campos requeridos para validación de firma');
      return false;
    }

    // Construir string de firma según documentación de ePayco
    // Formato: cust_id_cliente^p_key^ref_payco^transaction_id^amount^currency_code
    const signatureString = `${x_cust_id_cliente}^${privateKey}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;

    console.log('🔐 Validando firma de webhook...');
    console.log('   String de firma:', signatureString.replace(privateKey, '***'));

    // Calcular hash SHA-256
    const expectedSignature = crypto
      .createHash('sha256')
      .update(signatureString)
      .digest('hex');

    console.log('   Firma esperada:', expectedSignature);
    console.log('   Firma recibida:', x_signature);

    // Comparar firmas (case-insensitive por si acaso)
    const isValid = expectedSignature.toLowerCase() === x_signature.toLowerCase();

    if (isValid) {
      console.log('✅ Firma válida - Webhook auténtico');
    } else {
      console.error('🚨 FIRMA INVÁLIDA - Posible intento de fraude');
      console.error('   Detalles para análisis:');
      console.error('   - Transaction ID:', x_transaction_id);
      console.error('   - Ref Payco:', x_ref_payco);
      console.error('   - Amount:', x_amount);
    }

    return isValid;

  } catch (error) {
    console.error('❌ Error validando firma:', error.message);
    return false;
  }
}

/**
 * Valida que el webhook provenga de ePayco (validación adicional)
 *
 * @param {Object} webhookData - Datos del webhook
 * @returns {boolean} true si pasa las validaciones básicas
 */
function validateWebhookIntegrity(webhookData) {
  const {
    x_transaction_id,
    x_amount,
    x_response,
    x_ref_payco
  } = webhookData;

  // Validaciones básicas
  if (!x_transaction_id || !x_amount || !x_response || !x_ref_payco) {
    console.error('❌ Webhook incompleto - faltan campos críticos');
    return false;
  }

  // Validar formato de transaction_id (debe ser numérico)
  if (!/^\d+$/.test(x_transaction_id)) {
    console.error('❌ Formato inválido de transaction_id');
    return false;
  }

  // Validar que el monto sea un número válido
  const amount = parseFloat(x_amount);
  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Monto inválido en webhook');
    return false;
  }

  // Validar que x_response tenga un valor válido
  const validResponses = ['aceptada', 'rechazada', 'pendiente', 'fallida'];
  if (!validResponses.includes(x_response?.toLowerCase())) {
    console.error('❌ Estado de respuesta inválido:', x_response);
    return false;
  }

  return true;
}

/**
 * Registra un intento de webhook inválido para análisis de seguridad
 *
 * @param {Object} webhookData - Datos del webhook
 * @param {string} reason - Razón del rechazo
 * @param {Object} metadata - Información adicional (IP, headers, etc.)
 */
function logInvalidWebhookAttempt(webhookData, reason, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    reason,
    transactionId: webhookData.x_transaction_id,
    refPayco: webhookData.x_ref_payco,
    amount: webhookData.x_amount,
    signature: webhookData.x_signature,
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    severity: 'HIGH'
  };

  console.error('🚨 INTENTO DE WEBHOOK INVÁLIDO DETECTADO:');
  console.error(JSON.stringify(logEntry, null, 2));

  // TODO: En producción, enviar a sistema de alertas (Sentry, DataDog, etc.)
  // TODO: Considerar bloqueo automático de IP después de N intentos

  return logEntry;
}

module.exports = {
  validateEpaycoSignature,
  validateWebhookIntegrity,
  logInvalidWebhookAttempt
};

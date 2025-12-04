/**
 * Script de prueba para validación de firma de ePayco
 * Ejecutar: node test-signature.js
 */

const { validateEpaycoSignature, validateWebhookIntegrity } = require('./src/utils/epaycoSignature');
const crypto = require('crypto');

console.log('🧪 PRUEBAS DE VALIDACIÓN DE FIRMA EPAYCO\n');

// Datos de prueba simulados
const PRIVATE_KEY = 'test_private_key';
const CUST_ID = '123456';

// Crear webhook de prueba válido
function createValidWebhook() {
  const webhook = {
    x_cust_id_cliente: CUST_ID,
    x_ref_payco: 'REF-12345',
    x_transaction_id: '98765',
    x_amount: '50000',
    x_currency_code: 'COP',
    x_response: 'Aceptada'
  };

  // Generar firma correcta
  const signatureString = `${webhook.x_cust_id_cliente}^${PRIVATE_KEY}^${webhook.x_ref_payco}^${webhook.x_transaction_id}^${webhook.x_amount}^${webhook.x_currency_code}`;
  webhook.x_signature = crypto.createHash('sha256').update(signatureString).digest('hex');

  return webhook;
}

// TEST 1: Webhook válido
console.log('TEST 1: Webhook con firma válida');
const validWebhook = createValidWebhook();
const isValid = validateEpaycoSignature(validWebhook, PRIVATE_KEY);
console.log(isValid ? '✅ PASS: Firma válida detectada correctamente\n' : '❌ FAIL: Debería ser válida\n');

// TEST 2: Webhook con firma incorrecta
console.log('TEST 2: Webhook con firma incorrecta');
const invalidWebhook = { ...createValidWebhook() };
invalidWebhook.x_signature = 'firma_falsa_12345';
const isInvalid = !validateEpaycoSignature(invalidWebhook, PRIVATE_KEY);
console.log(isInvalid ? '✅ PASS: Firma inválida detectada correctamente\n' : '❌ FAIL: Debería ser inválida\n');

// TEST 3: Webhook con monto manipulado
console.log('TEST 3: Webhook con monto manipulado');
const tamperedWebhook = createValidWebhook();
tamperedWebhook.x_amount = '1'; // Cambiar monto pero mantener firma original
const isTampered = !validateEpaycoSignature(tamperedWebhook, PRIVATE_KEY);
console.log(isTampered ? '✅ PASS: Manipulación detectada correctamente\n' : '❌ FAIL: Debería detectar manipulación\n');

// TEST 4: Validación de integridad básica
console.log('TEST 4: Validación de integridad básica');
const completeWebhook = {
  x_transaction_id: '12345',
  x_amount: '50000',
  x_response: 'Aceptada',
  x_ref_payco: 'REF-123'
};
const hasIntegrity = validateWebhookIntegrity(completeWebhook);
console.log(hasIntegrity ? '✅ PASS: Webhook completo validado\n' : '❌ FAIL: Debería ser válido\n');

// TEST 5: Webhook incompleto
console.log('TEST 5: Webhook incompleto (falta transaction_id)');
const incompleteWebhook = {
  x_amount: '50000',
  x_response: 'Aceptada'
};
const lacksIntegrity = !validateWebhookIntegrity(incompleteWebhook);
console.log(lacksIntegrity ? '✅ PASS: Webhook incompleto rechazado\n' : '❌ FAIL: Debería ser rechazado\n');

// TEST 6: Webhook con estado inválido
console.log('TEST 6: Webhook con estado inválido');
const invalidStatusWebhook = {
  x_transaction_id: '12345',
  x_amount: '50000',
  x_response: 'EstadoInventado',
  x_ref_payco: 'REF-123'
};
const hasInvalidStatus = !validateWebhookIntegrity(invalidStatusWebhook);
console.log(hasInvalidStatus ? '✅ PASS: Estado inválido rechazado\n' : '❌ FAIL: Debería ser rechazado\n');

console.log('🎉 TODAS LAS PRUEBAS COMPLETADAS');
console.log('\n📝 Para probar con datos reales de ePayco:');
console.log('   1. Activa VALIDATE_SIGNATURE=true en .env');
console.log('   2. Haz una transacción de prueba');
console.log('   3. Revisa los logs del webhook');

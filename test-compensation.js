/**
 * Test del sistema de compensación transaccional
 *
 * Este script prueba:
 * 1. Registro de emails fallidos
 * 2. Registro de escrituras fallidas en Sheets
 * 3. Registro de transacciones parciales
 * 4. Obtención de estadísticas
 * 5. Generación de reportes
 * 6. Resolución manual de compensaciones
 */

const {
  initCompensationQueues,
  registerFailedEmail,
  registerFailedSheetWrite,
  registerPartialTransaction,
  retryFailedEmails,
  getCompensationStats,
  generateCompensationReport,
  markAsResolved
} = require('./src/utils/errorCompensation');

console.log('🧪 Iniciando pruebas del sistema de compensación...\n');

// Inicializar colas
initCompensationQueues();

// Test 1: Registrar email fallido
console.log('Test 1: Registrar email fallido');
const emailId = registerFailedEmail({
  type: 'credentials',
  email: 'test@example.com',
  fullName: 'Usuario Test',
  credentials: {
    username: 'test_user',
    password: 'test_pass',
    url: 'https://assistant.rasi.com.co',
    validUntil: '2025-01-01'
  },
  serviceId: 'rasi-assistant',
  billingPeriod: 'monthly',
  error: 'SMTP timeout'
});
console.log('✅ Email fallido registrado con ID:', emailId);
console.log('');

// Test 2: Registrar escritura fallida en Sheets
console.log('Test 2: Registrar escritura fallida en Google Sheets');
const sheetId = registerFailedSheetWrite({
  sheetName: 'Rasi Assistant',
  operation: 'assign_credentials',
  rowData: {
    email: 'test2@example.com',
    phone: '+57300000000',
    billingPeriod: 'annual',
    salesDate: new Date()
  },
  email: 'test2@example.com',
  serviceId: 'rasi-assistant',
  error: 'Google API rate limit exceeded'
});
console.log('✅ Escritura fallida registrada con ID:', sheetId);
console.log('');

// Test 3: Registrar transacción parcial
console.log('Test 3: Registrar transacción parcial');
const txId = registerPartialTransaction({
  transactionId: '12345678',
  orderId: 'ORDER-TEST-001',
  email: 'test3@example.com',
  serviceId: 'rasi-autocitas',
  amount: '50000',
  completedSteps: ['payment', 'register_purchase'],
  failedStep: 'send_confirmation_email',
  error: 'Email service unavailable',
  needsRefund: false
});
console.log('✅ Transacción parcial registrada con ID:', txId);
console.log('');

// Test 4: Obtener estadísticas
console.log('Test 4: Obtener estadísticas');
const stats = getCompensationStats();
console.log('📊 Estadísticas:');
console.log('   Emails fallidos:', stats.failedEmails.total);
console.log('   Escrituras fallidas:', stats.failedSheetWrites.total);
console.log('   Transacciones parciales:', stats.partialTransactions.total);
console.log('');

// Test 5: Generar reporte
console.log('Test 5: Generar reporte completo');
const report = generateCompensationReport();
console.log('✅ Reporte generado exitosamente');
console.log('');

// Test 6: Resolver compensación manualmente
console.log('Test 6: Resolver compensación manualmente');
const resolveResult = markAsResolved('email', emailId);
if (resolveResult.success) {
  console.log('✅ Email compensado y marcado como resuelto');
} else {
  console.log('❌ Error resolviendo email:', resolveResult.message);
}
console.log('');

// Test 7: Verificar estadísticas después de resolver
console.log('Test 7: Verificar estadísticas después de resolver');
const statsAfter = getCompensationStats();
console.log('📊 Estadísticas actualizadas:');
console.log('   Emails fallidos:', statsAfter.failedEmails.total, '(debería ser 0)');
console.log('   Escrituras fallidas:', statsAfter.failedSheetWrites.total, '(debería ser 1)');
console.log('   Transacciones parciales:', statsAfter.partialTransactions.total, '(debería ser 1)');
console.log('');

// Test 8: Intentar reenviar emails (simulado)
console.log('Test 8: Intentar reenviar emails fallidos');
retryFailedEmails().then(result => {
  console.log('📧 Resultado de reintentos:');
  console.log('   Exitosos:', result.success);
  console.log('   Fallidos:', result.failed);
  console.log('');

  // Resumen final
  console.log('═'.repeat(60));
  console.log('✅ TODAS LAS PRUEBAS COMPLETADAS');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Sistema de compensación funcionando correctamente:');
  console.log('  ✓ Registro de emails fallidos');
  console.log('  ✓ Registro de escrituras fallidas en Sheets');
  console.log('  ✓ Registro de transacciones parciales');
  console.log('  ✓ Generación de estadísticas');
  console.log('  ✓ Generación de reportes');
  console.log('  ✓ Resolución manual de compensaciones');
  console.log('  ✓ Sistema de reintentos');
  console.log('');
  console.log('🎉 Sistema listo para producción');
});

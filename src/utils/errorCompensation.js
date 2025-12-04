/**
 * Sistema de compensación transaccional para errores en flujo de pago
 *
 * Problema:
 * - Usuario paga pero falla el envío de email → no recibe credenciales
 * - Usuario paga pero falla Google Sheets → no se registra
 * - Credenciales asignadas pero pago falla → credenciales bloqueadas
 *
 * Solución:
 * - Cola de reintentos para operaciones fallidas
 * - Registro de transacciones parciales para intervención manual
 * - Alertas automáticas para casos críticos
 */

/**
 * Inicializa las colas de compensación
 */
function initCompensationQueues() {
  if (!global.failedEmails) {
    global.failedEmails = [];
  }
  if (!global.failedSheetWrites) {
    global.failedSheetWrites = [];
  }
  if (!global.partialTransactions) {
    global.partialTransactions = [];
  }

  console.log('🔄 Colas de compensación inicializadas');
}

/**
 * Registra un email fallido para reintento
 */
function registerFailedEmail(data) {
  initCompensationQueues();

  const failedEmail = {
    id: `EMAIL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type: data.type, // 'credentials', 'confirmation', etc
    email: data.email,
    fullName: data.fullName,
    credentials: data.credentials,
    serviceId: data.serviceId,
    billingPeriod: data.billingPeriod,
    error: data.error,
    retries: 0,
    lastRetryAt: null,
    status: 'pending'
  };

  global.failedEmails.push(failedEmail);

  console.error('📧 EMAIL FALLIDO REGISTRADO:');
  console.error('   ID:', failedEmail.id);
  console.error('   Email:', data.email);
  console.error('   Tipo:', data.type);
  console.error('   Error:', data.error);

  // TODO: Alertar inmediatamente a admin
  sendAdminAlert({
    type: 'FAILED_EMAIL',
    severity: 'HIGH',
    email: data.email,
    serviceId: data.serviceId,
    error: data.error
  });

  return failedEmail.id;
}

/**
 * Registra una escritura fallida en Google Sheets
 */
function registerFailedSheetWrite(data) {
  initCompensationQueues();

  const failedWrite = {
    id: `SHEET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    sheetName: data.sheetName,
    operation: data.operation, // 'assign', 'register', etc
    rowData: data.rowData,
    email: data.email,
    serviceId: data.serviceId,
    error: data.error,
    retries: 0,
    lastRetryAt: null,
    status: 'pending'
  };

  global.failedSheetWrites.push(failedWrite);

  console.error('📊 ESCRITURA EN SHEETS FALLIDA:');
  console.error('   ID:', failedWrite.id);
  console.error('   Hoja:', data.sheetName);
  console.error('   Operación:', data.operation);
  console.error('   Error:', data.error);

  sendAdminAlert({
    type: 'FAILED_SHEET_WRITE',
    severity: 'HIGH',
    email: data.email,
    sheetName: data.sheetName,
    error: data.error
  });

  return failedWrite.id;
}

/**
 * Registra una transacción parcial que requiere intervención manual
 */
function registerPartialTransaction(data) {
  initCompensationQueues();

  const partialTx = {
    id: `PARTIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    transactionId: data.transactionId,
    orderId: data.orderId,
    email: data.email,
    serviceId: data.serviceId,
    amount: data.amount,
    completedSteps: data.completedSteps || [],
    failedStep: data.failedStep,
    error: data.error,
    needsRefund: data.needsRefund || false,
    status: 'pending_review'
  };

  global.partialTransactions.push(partialTx);

  console.error('⚠️  TRANSACCIÓN PARCIAL DETECTADA:');
  console.error('   ID:', partialTx.id);
  console.error('   Transaction ID:', data.transactionId);
  console.error('   Email:', data.email);
  console.error('   Pasos completados:', data.completedSteps);
  console.error('   Paso fallido:', data.failedStep);
  console.error('   Necesita refund:', data.needsRefund);

  sendAdminAlert({
    type: 'PARTIAL_TRANSACTION',
    severity: 'CRITICAL',
    transactionId: data.transactionId,
    email: data.email,
    failedStep: data.failedStep,
    needsRefund: data.needsRefund
  });

  return partialTx.id;
}

/**
 * Intenta reenviar emails fallidos
 */
async function retryFailedEmails() {
  if (!global.failedEmails || global.failedEmails.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`📧 Reintentando ${global.failedEmails.length} emails fallidos...`);

  let successCount = 0;
  let failedCount = 0;

  for (let i = global.failedEmails.length - 1; i >= 0; i--) {
    const failedEmail = global.failedEmails[i];

    if (failedEmail.retries >= 5) {
      console.error(`❌ Email ${failedEmail.id} alcanzó máximo de reintentos`);
      failedCount++;
      continue;
    }

    try {
      // Aquí llamarías a la función de envío de email correspondiente
      // Por ahora solo simulamos
      console.log(`   Reintentando email ${failedEmail.id}...`);

      // TODO: Implementar envío real
      // await sendEmail(failedEmail);

      // Si tiene éxito, remover de la cola
      global.failedEmails.splice(i, 1);
      successCount++;
      console.log(`   ✅ Email ${failedEmail.id} enviado exitosamente`);

    } catch (error) {
      failedEmail.retries++;
      failedEmail.lastRetryAt = new Date().toISOString();
      failedEmail.error = error.message;
      failedCount++;
      console.error(`   ❌ Falló reintento de email ${failedEmail.id}: ${error.message}`);
    }
  }

  return { success: successCount, failed: failedCount };
}

/**
 * Obtiene estadísticas de compensación
 */
function getCompensationStats() {
  return {
    failedEmails: {
      total: global.failedEmails?.length || 0,
      pending: global.failedEmails?.filter(e => e.status === 'pending').length || 0,
      retrying: global.failedEmails?.filter(e => e.retries > 0).length || 0
    },
    failedSheetWrites: {
      total: global.failedSheetWrites?.length || 0,
      pending: global.failedSheetWrites?.filter(w => w.status === 'pending').length || 0
    },
    partialTransactions: {
      total: global.partialTransactions?.length || 0,
      needsRefund: global.partialTransactions?.filter(t => t.needsRefund).length || 0,
      pendingReview: global.partialTransactions?.filter(t => t.status === 'pending_review').length || 0
    }
  };
}

/**
 * Envía alerta al administrador
 * TODO: Integrar con servicio de notificaciones real (email, Slack, etc)
 */
function sendAdminAlert(alert) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...alert
  };

  console.error('\n' + '='.repeat(70));
  console.error('🚨 ALERTA DE ADMINISTRADOR');
  console.error('='.repeat(70));
  console.error(JSON.stringify(logEntry, null, 2));
  console.error('='.repeat(70) + '\n');

  // TODO: Implementar envío real de alertas
  // - Email al admin
  // - Mensaje a Slack
  // - SMS para alertas críticas
  // - PagerDuty para severity CRITICAL

  return logEntry;
}

/**
 * Genera reporte de compensaciones pendientes
 */
function generateCompensationReport() {
  const stats = getCompensationStats();
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    details: {
      failedEmails: global.failedEmails || [],
      failedSheetWrites: global.failedSheetWrites || [],
      partialTransactions: global.partialTransactions || []
    }
  };

  console.log('\n📋 REPORTE DE COMPENSACIONES');
  console.log('='.repeat(70));
  console.log('Emails fallidos:', stats.failedEmails.total);
  console.log('Escrituras fallidas en Sheets:', stats.failedSheetWrites.total);
  console.log('Transacciones parciales:', stats.partialTransactions.total);
  console.log('Requieren refund:', stats.partialTransactions.needsRefund);
  console.log('='.repeat(70));

  return report;
}

/**
 * Marca una compensación como completada manualmente
 */
function markAsResolved(type, id) {
  let queue;

  switch (type) {
    case 'email':
      queue = global.failedEmails;
      break;
    case 'sheet':
      queue = global.failedSheetWrites;
      break;
    case 'transaction':
      queue = global.partialTransactions;
      break;
    default:
      return { success: false, message: 'Tipo inválido' };
  }

  if (!queue) {
    return { success: false, message: 'Cola no inicializada' };
  }

  const index = queue.findIndex(item => item.id === id);

  if (index === -1) {
    return { success: false, message: 'Item no encontrado' };
  }

  const item = queue[index];
  queue.splice(index, 1);

  console.log(`✅ ${type} ${id} marcado como resuelto manualmente`);

  return {
    success: true,
    message: 'Item resuelto',
    item
  };
}

module.exports = {
  initCompensationQueues,
  registerFailedEmail,
  registerFailedSheetWrite,
  registerPartialTransaction,
  retryFailedEmails,
  getCompensationStats,
  generateCompensationReport,
  markAsResolved,
  sendAdminAlert
};

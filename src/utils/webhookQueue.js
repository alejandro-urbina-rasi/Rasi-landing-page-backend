/**
 * Cola de reintentos para webhooks de ePayco
 *
 * Problema:
 * - A veces el webhook llega ANTES que createSession guarde la orden
 * - Webhook se procesa sin datos de orden → se pierde
 * - ePayco no reintenta automáticamente en todos los casos
 *
 * Solución:
 * - Cola temporal de webhooks pendientes
 * - Reintentos automáticos cada 30 segundos
 * - Máximo 5 minutos de espera
 * - Fallback a búsqueda en Google Sheets
 */

const RETRY_INTERVAL = 30 * 1000; // 30 segundos
const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutos
const MAX_RETRIES = 10; // 10 intentos

let retryIntervalId = null;

/**
 * Inicializa la cola de webhooks pendientes
 */
function initWebhookQueue() {
  if (!global.webhookQueue) {
    global.webhookQueue = [];
    console.log('📦 Cola de webhooks inicializada');
  }

  if (!retryIntervalId) {
    startRetryProcessor();
  }
}

/**
 * Agrega un webhook a la cola para reintento
 *
 * @param {Object} webhookData - Datos del webhook
 * @param {string} reason - Razón del reintento
 */
function enqueueWebhook(webhookData, reason) {
  initWebhookQueue();

  const queueItem = {
    id: `QUEUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    webhookData,
    reason,
    enqueuedAt: Date.now(),
    retries: 0,
    lastRetryAt: null,
    orderId: webhookData.x_extra1,
    transactionId: webhookData.x_transaction_id
  };

  global.webhookQueue.push(queueItem);

  console.log('📥 Webhook encolado para reintento:');
  console.log('   ID:', queueItem.id);
  console.log('   Order ID:', queueItem.orderId);
  console.log('   Transaction ID:', queueItem.transactionId);
  console.log('   Razón:', reason);
  console.log('   Cola actual:', global.webhookQueue.length, 'items');

  return queueItem.id;
}

/**
 * Inicia el procesador de reintentos
 */
function startRetryProcessor() {
  if (retryIntervalId) {
    console.log('⚠️  Procesador de reintentos ya está activo');
    return;
  }

  console.log('🔄 Iniciando procesador de reintentos de webhooks');
  console.log(`   Intervalo: cada ${RETRY_INTERVAL / 1000} segundos`);

  retryIntervalId = setInterval(async () => {
    await processQueuedWebhooks();
  }, RETRY_INTERVAL);

  // No mantener el proceso vivo
  if (retryIntervalId.unref) {
    retryIntervalId.unref();
  }

  return retryIntervalId;
}

/**
 * Detiene el procesador de reintentos
 */
function stopRetryProcessor() {
  if (retryIntervalId) {
    clearInterval(retryIntervalId);
    retryIntervalId = null;
    console.log('🛑 Procesador de reintentos detenido');
  }
}

/**
 * Procesa webhooks encolados
 */
async function processQueuedWebhooks() {
  if (!global.webhookQueue || global.webhookQueue.length === 0) {
    return;
  }

  const now = Date.now();
  const queue = [...global.webhookQueue]; // Copiar para evitar modificaciones concurrentes

  console.log(`🔄 Procesando cola de webhooks (${queue.length} pendientes)`);

  for (let i = queue.length - 1; i >= 0; i--) {
    const item = queue[i];
    const age = now - item.enqueuedAt;
    const timeSinceLastRetry = item.lastRetryAt ? now - item.lastRetryAt : RETRY_INTERVAL;

    // Verificar si expiró el tiempo máximo de espera
    if (age > MAX_WAIT_TIME) {
      console.warn(`⏰ Webhook expiró (${Math.round(age / 1000 / 60)} min):`);
      console.warn('   Order ID:', item.orderId);
      console.warn('   Transaction ID:', item.transactionId);

      // TODO: Alertar a admin - orden no procesada después de 5 minutos
      logExpiredWebhook(item);

      // Remover de la cola
      global.webhookQueue.splice(global.webhookQueue.indexOf(item), 1);
      continue;
    }

    // Verificar si han pasado suficientes segundos desde el último intento
    if (timeSinceLastRetry < RETRY_INTERVAL) {
      continue;
    }

    // Verificar límite de reintentos
    if (item.retries >= MAX_RETRIES) {
      console.error(`❌ Webhook alcanzó máximo de reintentos:`);
      console.error('   Order ID:', item.orderId);
      console.error('   Reintentos:', item.retries);

      logExpiredWebhook(item);
      global.webhookQueue.splice(global.webhookQueue.indexOf(item), 1);
      continue;
    }

    // Intentar procesar el webhook
    try {
      console.log(`🔄 Reintentando webhook (intento ${item.retries + 1}/${MAX_RETRIES}):`);
      console.log('   Order ID:', item.orderId);

      const processed = await retryWebhookProcessing(item);

      if (processed) {
        console.log('✅ Webhook procesado exitosamente en reintento');
        // Remover de la cola
        global.webhookQueue.splice(global.webhookQueue.indexOf(item), 1);
      } else {
        // Incrementar contador de reintentos
        item.retries++;
        item.lastRetryAt = now;
        console.log(`⏳ Webhook aún no procesable, reintentando en ${RETRY_INTERVAL / 1000}s`);
      }

    } catch (error) {
      console.error('❌ Error procesando webhook en reintento:', error.message);
      item.retries++;
      item.lastRetryAt = now;
    }
  }

  const remaining = global.webhookQueue.length;
  if (remaining > 0) {
    console.log(`📦 Cola actual: ${remaining} webhooks pendientes`);
  }
}

/**
 * Intenta procesar un webhook encolado
 *
 * @param {Object} queueItem - Item de la cola
 * @returns {boolean} true si se procesó exitosamente
 */
async function retryWebhookProcessing(queueItem) {
  const { webhookData, orderId } = queueItem;

  // Verificar si la orden ya existe en pendingOrders
  if (global.pendingOrders && global.pendingOrders[orderId]) {
    console.log('✅ Orden encontrada en pendingOrders');

    // Procesar el webhook con los datos de la orden
    // Aquí llamarías a la lógica de procesamiento del webhook
    // Por ahora solo retornamos true para indicar que se puede procesar

    // TODO: Llamar a la función de procesamiento del webhook
    // await processWebhookWithOrderData(webhookData, global.pendingOrders[orderId]);

    return true;
  }

  // TODO: Buscar en Google Sheets como fallback
  // const orderFromSheets = await findOrderInGoogleSheets(orderId);
  // if (orderFromSheets) {
  //   await processWebhookWithOrderData(webhookData, orderFromSheets);
  //   return true;
  // }

  console.log('⏳ Orden aún no disponible:', orderId);
  return false;
}

/**
 * Registra webhook expirado para análisis
 */
function logExpiredWebhook(item) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'WEBHOOK_EXPIRED',
    orderId: item.orderId,
    transactionId: item.transactionId,
    retries: item.retries,
    age: Math.round((Date.now() - item.enqueuedAt) / 1000 / 60), // minutos
    reason: item.reason,
    severity: 'HIGH'
  };

  console.error('📋 WEBHOOK EXPIRADO SIN PROCESAR:');
  console.error(JSON.stringify(logEntry, null, 2));

  // TODO: Enviar alerta al equipo
  // TODO: Guardar en base de datos para análisis
  // TODO: Considerar refund manual si el pago fue exitoso

  return logEntry;
}

/**
 * Obtiene estadísticas de la cola
 */
function getQueueStats() {
  const queue = global.webhookQueue || [];
  const now = Date.now();

  const stats = {
    total: queue.length,
    byRetries: {
      '0-2': 0,
      '3-5': 0,
      '6-10': 0
    },
    byAge: {
      lessThan1min: 0,
      between1and3min: 0,
      between3and5min: 0,
      moreThan5min: 0
    },
    oldest: null,
    newest: null
  };

  if (queue.length === 0) {
    return stats;
  }

  let oldestAge = 0;
  let newestAge = Infinity;

  for (const item of queue) {
    // Por reintentos
    if (item.retries <= 2) {
      stats.byRetries['0-2']++;
    } else if (item.retries <= 5) {
      stats.byRetries['3-5']++;
    } else {
      stats.byRetries['6-10']++;
    }

    // Por edad
    const age = now - item.enqueuedAt;
    const ageMinutes = age / 1000 / 60;

    if (ageMinutes < 1) {
      stats.byAge.lessThan1min++;
    } else if (ageMinutes < 3) {
      stats.byAge.between1and3min++;
    } else if (ageMinutes < 5) {
      stats.byAge.between3and5min++;
    } else {
      stats.byAge.moreThan5min++;
    }

    // Tracking
    if (age > oldestAge) {
      oldestAge = age;
      stats.oldest = {
        orderId: item.orderId,
        age: Math.round(ageMinutes),
        retries: item.retries
      };
    }

    if (age < newestAge) {
      newestAge = age;
      stats.newest = {
        orderId: item.orderId,
        age: Math.round(ageMinutes),
        retries: item.retries
      };
    }
  }

  return stats;
}

/**
 * Limpia la cola manualmente
 */
function clearQueue() {
  const count = global.webhookQueue ? global.webhookQueue.length : 0;
  global.webhookQueue = [];
  console.log(`🗑️  Cola limpiada: ${count} webhooks removidos`);
  return count;
}

module.exports = {
  initWebhookQueue,
  enqueueWebhook,
  startRetryProcessor,
  stopRetryProcessor,
  processQueuedWebhooks,
  getQueueStats,
  clearQueue,
  RETRY_INTERVAL,
  MAX_WAIT_TIME,
  MAX_RETRIES
};

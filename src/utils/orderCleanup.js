/**
 * Sistema de limpieza automática de órdenes pendientes
 *
 * Problema:
 * - global.pendingOrders crece infinitamente
 * - Usuarios cierran checkout sin pagar
 * - Memoria del servidor se satura
 *
 * Solución:
 * - Limpieza automática cada 5 minutos
 * - Timeout de 30 minutos por orden
 * - Logs de órdenes limpiadas para análisis
 */

const ORDER_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

let cleanupIntervalId = null;

/**
 * Inicia el servicio de limpieza automática
 */
function startOrderCleanup() {
  if (cleanupIntervalId) {
    console.log('⚠️  Limpieza de órdenes ya está activa');
    return;
  }

  console.log('🧹 Iniciando servicio de limpieza de órdenes pendientes');
  console.log(`   Timeout: ${ORDER_TIMEOUT / 1000 / 60} minutos`);
  console.log(`   Frecuencia: cada ${CLEANUP_INTERVAL / 1000 / 60} minutos`);

  // Limpiar inmediatamente al iniciar
  cleanupExpiredOrders();

  // Luego cada intervalo
  cleanupIntervalId = setInterval(() => {
    cleanupExpiredOrders();
  }, CLEANUP_INTERVAL);

  // Asegurar que el intervalo no mantenga el proceso vivo
  if (cleanupIntervalId.unref) {
    cleanupIntervalId.unref();
  }

  return cleanupIntervalId;
}

/**
 * Detiene el servicio de limpieza automática
 */
function stopOrderCleanup() {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.log('🛑 Servicio de limpieza detenido');
  }
}

/**
 * Limpia órdenes expiradas
 */
function cleanupExpiredOrders() {
  try {
    const now = Date.now();
    const orders = global.pendingOrders || {};
    const orderIds = Object.keys(orders);

    if (orderIds.length === 0) {
      console.log('🧹 Limpieza: No hay órdenes pendientes');
      return { cleaned: 0, remaining: 0 };
    }

    console.log(`🧹 Iniciando limpieza de órdenes (${orderIds.length} pendientes)`);

    let cleanedCount = 0;
    const cleanedOrders = [];

    for (const orderId of orderIds) {
      const order = orders[orderId];

      // Validar que la orden tenga timestamp
      if (!order.createdAt) {
        console.warn(`⚠️  Orden sin timestamp: ${orderId} - limpiando por seguridad`);
        delete global.pendingOrders[orderId];
        cleanedCount++;
        continue;
      }

      // Calcular edad de la orden
      const orderAge = now - new Date(order.createdAt).getTime();

      if (orderAge > ORDER_TIMEOUT) {
        // Orden expirada - limpiar
        cleanedOrders.push({
          orderId,
          serviceId: order.serviceId,
          email: order.email,
          amount: order.amount,
          age: Math.round(orderAge / 1000 / 60), // minutos
          createdAt: order.createdAt
        });

        delete global.pendingOrders[orderId];
        cleanedCount++;
      }
    }

    const remainingCount = Object.keys(global.pendingOrders || {}).length;

    if (cleanedCount > 0) {
      console.log(`✅ Limpieza completada:`);
      console.log(`   Órdenes limpiadas: ${cleanedCount}`);
      console.log(`   Órdenes restantes: ${remainingCount}`);

      // Log detallado de órdenes limpiadas
      cleanedOrders.forEach(order => {
        console.log(`   - ${order.orderId}: ${order.serviceId} ($${order.amount}) - ${order.age} min`);
      });

      // TODO: Guardar en base de datos para análisis
      // - Tasa de abandono de checkout
      // - Servicios con más abandono
      // - Patrones de comportamiento
    } else {
      console.log(`✅ Limpieza: 0 órdenes expiradas (${remainingCount} activas)`);
    }

    return {
      cleaned: cleanedCount,
      remaining: remainingCount,
      cleanedOrders
    };

  } catch (error) {
    console.error('❌ Error en limpieza de órdenes:', error);
    return { cleaned: 0, remaining: 0, error: error.message };
  }
}

/**
 * Obtiene estadísticas de órdenes pendientes
 */
function getOrderStats() {
  const orders = global.pendingOrders || {};
  const orderIds = Object.keys(orders);
  const now = Date.now();

  const stats = {
    total: orderIds.length,
    byService: {},
    byAge: {
      lessThan5min: 0,
      between5and15min: 0,
      between15and30min: 0,
      moreThan30min: 0
    },
    oldest: null,
    newest: null
  };

  if (orderIds.length === 0) {
    return stats;
  }

  let oldestAge = 0;
  let newestAge = Infinity;

  for (const orderId of orderIds) {
    const order = orders[orderId];
    const serviceId = order.serviceId || 'unknown';

    // Contar por servicio
    stats.byService[serviceId] = (stats.byService[serviceId] || 0) + 1;

    // Calcular edad
    if (order.createdAt) {
      const age = now - new Date(order.createdAt).getTime();
      const ageMinutes = age / 1000 / 60;

      // Clasificar por edad
      if (ageMinutes < 5) {
        stats.byAge.lessThan5min++;
      } else if (ageMinutes < 15) {
        stats.byAge.between5and15min++;
      } else if (ageMinutes < 30) {
        stats.byAge.between15and30min++;
      } else {
        stats.byAge.moreThan30min++;
      }

      // Tracking de más antigua y más nueva
      if (age > oldestAge) {
        oldestAge = age;
        stats.oldest = {
          orderId,
          age: Math.round(ageMinutes),
          serviceId
        };
      }

      if (age < newestAge) {
        newestAge = age;
        stats.newest = {
          orderId,
          age: Math.round(ageMinutes),
          serviceId
        };
      }
    }
  }

  return stats;
}

/**
 * Limpieza manual de una orden específica
 */
function cleanupOrder(orderId) {
  if (!global.pendingOrders || !global.pendingOrders[orderId]) {
    return { success: false, message: 'Orden no encontrada' };
  }

  const order = global.pendingOrders[orderId];
  delete global.pendingOrders[orderId];

  console.log(`🗑️  Orden ${orderId} limpiada manualmente`);

  return {
    success: true,
    message: 'Orden limpiada',
    order
  };
}

/**
 * Forzar limpieza inmediata (para testing o mantenimiento)
 */
function forceCleanup() {
  console.log('🔥 Forzando limpieza inmediata de todas las órdenes');
  return cleanupExpiredOrders();
}

module.exports = {
  startOrderCleanup,
  stopOrderCleanup,
  cleanupExpiredOrders,
  getOrderStats,
  cleanupOrder,
  forceCleanup,
  ORDER_TIMEOUT,
  CLEANUP_INTERVAL
};

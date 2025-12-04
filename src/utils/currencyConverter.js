// utils/currencyConverter.js
const NodeCache = require('node-cache');

// Cache de tasas de cambio (1 hora TTL)
const cache = new NodeCache({ stdTTL: 3600 });

// Límites de seguridad para tasa de cambio USD-COP
// Si la tasa está fuera de estos rangos, probablemente sea un error de API
const TASA_MIN = 3500;  // COP por USD (mínimo histórico razonable)
const TASA_MAX = 5500;  // COP por USD (máximo histórico razonable)
const VARIACION_MAXIMA_DIARIA = 0.05; // 5% de variación máxima diaria

/**
 * Obtener tasa de cambio USD -> COP en tiempo real
 * Usa caché para evitar saturar la API
 *
 * Mejoras de seguridad:
 * - Validación de rangos (3500-5500 COP)
 * - Detección de variaciones anormales (>5% diario)
 * - Alertas automáticas si detecta anomalías
 */
async function getTasaCambio() {
  try {
    // Verificar si está en caché
    const tasaEnCache = cache.get('USD_COP_RATE');
    if (tasaEnCache) {
      console.log(`📊 Tasa de caché: 1 USD = $${tasaEnCache} COP`);
      return tasaEnCache;
    }

    console.log('📡 Consultando tasa de cambio en tiempo real...');

    // Obtener de la API (exchangerate-api.com - gratuito)
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD',
      { timeout: 5000 }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const tasa = data.rates.COP;

    // ============================================
    // VALIDACIÓN 1: Rango absoluto
    // ============================================
    if (tasa < TASA_MIN || tasa > TASA_MAX) {
      console.error('🚨 TASA DE CAMBIO FUERA DE RANGO NORMAL');
      console.error(`   Tasa recibida: ${tasa} COP`);
      console.error(`   Rango esperado: ${TASA_MIN} - ${TASA_MAX} COP`);

      // Alertar al equipo
      logCurrencyAlert({
        type: 'OUT_OF_RANGE',
        rate: tasa,
        min: TASA_MIN,
        max: TASA_MAX,
        severity: 'HIGH'
      });

      // Usar tasa anterior del caché si existe
      const lastKnownRate = cache.get('USD_COP_RATE_LAST_VALID');
      if (lastKnownRate) {
        console.warn(`⚠️  Usando última tasa válida conocida: ${lastKnownRate} COP`);
        return lastKnownRate;
      }

      // Si no hay caché, usar tasa por defecto
      const tasaDefecto = parseFloat(process.env.DEFAULT_USD_COP_RATE) || 4200;
      console.warn(`⚠️  Usando tasa por defecto: ${tasaDefecto} COP`);
      return tasaDefecto;
    }

    // ============================================
    // VALIDACIÓN 2: Variación diaria
    // ============================================
    const lastValidRate = cache.get('USD_COP_RATE_LAST_VALID');
    if (lastValidRate) {
      const variacion = Math.abs((tasa - lastValidRate) / lastValidRate);

      if (variacion > VARIACION_MAXIMA_DIARIA) {
        console.warn('⚠️  VARIACIÓN INUSUAL EN TASA DE CAMBIO');
        console.warn(`   Tasa anterior: ${lastValidRate} COP`);
        console.warn(`   Tasa nueva: ${tasa} COP`);
        console.warn(`   Variación: ${(variacion * 100).toFixed(2)}%`);

        logCurrencyAlert({
          type: 'UNUSUAL_VARIATION',
          oldRate: lastValidRate,
          newRate: tasa,
          variation: (variacion * 100).toFixed(2) + '%',
          severity: 'MEDIUM'
        });

        // Permitir la tasa pero alertar
        // En un sistema más estricto, podrías rechazarla
      }
    }

    // Guardar en caché
    cache.set('USD_COP_RATE', tasa);
    cache.set('USD_COP_RATE_LAST_VALID', tasa); // Backup de última tasa válida

    console.log(`✅ Tasa obtenida de API: 1 USD = $${tasa} COP`);
    return tasa;

  } catch (error) {
    console.error('❌ Error obteniendo tasa de cambio:', error.message);

    // Intentar usar última tasa válida del caché
    const lastValidRate = cache.get('USD_COP_RATE_LAST_VALID');
    if (lastValidRate) {
      console.warn(`⚠️  API caída, usando última tasa válida: ${lastValidRate} COP`);
      return lastValidRate;
    }

    // Usar tasa por defecto como último recurso
    const tasaDefecto = parseFloat(process.env.DEFAULT_USD_COP_RATE) || 4200;
    console.warn(`⚠️  Usando tasa por defecto: ${tasaDefecto} COP`);

    // Alertar que la API está caída
    logCurrencyAlert({
      type: 'API_DOWN',
      error: error.message,
      fallbackRate: tasaDefecto,
      severity: 'HIGH'
    });

    return tasaDefecto;
  }
}

/**
 * Registra alertas de moneda para análisis y notificaciones
 */
function logCurrencyAlert(alert) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...alert
  };

  console.error('📋 ALERTA DE CONVERSIÓN DE MONEDA:');
  console.error(JSON.stringify(logEntry, null, 2));

  // TODO: Enviar alerta al equipo si severity es HIGH
  // TODO: Integrar con sistema de monitoreo
  // TODO: Considerar pausar conversiones automáticas si hay múltiples alertas

  return logEntry;
}

/**
 * Convertir USD a COP con validaciones de seguridad
 *
 * @param {number} montoUSD - Monto en dólares
 * @returns {number} Monto en pesos colombianos
 */
async function convertUSDtoCOP(montoUSD) {
  // Validar monto de entrada
  if (typeof montoUSD !== 'number' || montoUSD <= 0) {
    throw new Error(`Monto inválido para conversión: ${montoUSD}`);
  }

  if (montoUSD > 10000) {
    console.warn(`⚠️  Conversión de monto muy alto: $${montoUSD} USD`);
    // Alertar si es sospechoso
    logCurrencyAlert({
      type: 'HIGH_AMOUNT_CONVERSION',
      amountUSD: montoUSD,
      severity: 'MEDIUM'
    });
  }

  const tasa = await getTasaCambio();
  const montoCOP = montoUSD * tasa;

  console.log(`💱 Conversión: $${montoUSD} USD × ${tasa} = $${montoCOP.toFixed(2)} COP`);

  // Redondear a 2 decimales (ePayco lo requiere)
  return Math.round(montoCOP * 100) / 100;
}

/**
 * Forzar actualización de la tasa de cambio
 */
function actualizarTasaCambio() {
  cache.del('USD_COP_RATE');
  console.log('🔄 Caché de tasa de cambio limpiado');
}

/**
 * Obtiene la última tasa válida conocida (para debugging)
 */
function getLastValidRate() {
  return cache.get('USD_COP_RATE_LAST_VALID') || null;
}

/**
 * Verifica si la tasa en caché aún es válida
 */
function isCacheValid() {
  const rate = cache.get('USD_COP_RATE');
  return rate !== undefined && rate !== null;
}

module.exports = {
  getTasaCambio,
  convertUSDtoCOP,
  actualizarTasaCambio,
  getLastValidRate,
  isCacheValid,
  // Exportar constantes para testing
  TASA_MIN,
  TASA_MAX,
  VARIACION_MAXIMA_DIARIA
};

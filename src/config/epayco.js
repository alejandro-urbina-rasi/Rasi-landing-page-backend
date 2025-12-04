const axios = require('axios');

const BASE64_CREDENTIALS = Buffer.from(
    `${process.env.EPAYCO_PUBLIC_KEY}:${process.env.EPAYCO_PRIVATE_KEY}`
).toString('base64');

let apifyToken = null;
let tokenExpiration = null;

/**
 * Autentica con ePayco Apify y obtiene token JWT
 *
 * Mejoras:
 * - Renovación anticipada (1 minuto antes de expirar)
 * - Retry automático en caso de fallo
 * - Cache del token para múltiples requests concurrentes
 *
 * @param {boolean} forceRefresh - Forzar renovación del token
 * @returns {Promise<string>} Token JWT de ePayco
 */
async function getApifyToken(forceRefresh = false) {
    try {
        // Renovar 1 minuto ANTES de que expire para evitar race conditions
        const SAFETY_MARGIN = 60 * 1000; // 1 minuto
        const needsRefresh = !apifyToken ||
                           !tokenExpiration ||
                           Date.now() >= (tokenExpiration - SAFETY_MARGIN);

        if (!forceRefresh && !needsRefresh) {
            const ttl = Math.round((tokenExpiration - Date.now()) / 1000);
            console.log(`✅ Reutilizando token Apify (expira en ${ttl}s)`);
            return apifyToken;
        }

        console.log('🔐 Autenticando con ePayco Apify...');

        const response = await axios.post(
            `${process.env.EPAYCO_APIFY_URL}/login`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${BASE64_CREDENTIALS}`
                },
                timeout: 10000 // 10 segundos timeout
            }
        );

        if (!response.data || !response.data.token) {
            throw new Error('Respuesta inválida de ePayco Apify: sin token');
        }

        apifyToken = response.data.token;
        // Token expira en 15 minutos según docs de ePayco
        tokenExpiration = Date.now() + (14 * 60 * 1000); // 14 min para safety margin

        const expiresIn = Math.round((tokenExpiration - Date.now()) / 1000);
        console.log(`✅ Token Apify obtenido exitosamente (expira en ${expiresIn}s)`);

        return apifyToken;

    } catch (error) {
        console.error('❌ Error autenticando con Apify:', error.response?.data || error.message);

        // Limpiar token inválido
        apifyToken = null;
        tokenExpiration = null;

        throw new Error('No se pudo autenticar con ePayco Apify: ' + error.message);
    }
}

/**
 * Obtener IP pública del cliente (fallback a IP local válida)
 */
function getClientIp(req) {
    let ip = req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress ||
        '0.0.0.0';

    // Si es IPv6 localhost (::1), usar una IP pública de test
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        ip = '201.245.254.45'; // IP de ejemplo de la documentación de ePayco
        console.log('ℹ️  IP local detectada, usando IP de test:', ip);
    }

    return ip;
}

/**
 * Crea una sesión de checkout en ePayco
 *
 * Implementa retry automático si el token expira durante la llamada
 *
 * @param {Object} paymentData - Datos del pago
 * @param {number} retryCount - Contador interno de reintentos
 * @returns {Promise<Object>} Datos de la sesión (sessionId, token)
 */
async function createCheckoutSession(paymentData, retryCount = 0) {
    const MAX_RETRIES = 2;

    try {
        const token = await getApifyToken();

        console.log('📝 Creando sesión de checkout en ePayco...');

        // Asegurar que billing.name es un string, no un array
        const billingName = typeof paymentData.billing?.name === 'string'
            ? paymentData.billing.name
            : (paymentData.billing?.name || 'Cliente').toString();

        // ✅ Construir payload sin response/confirmation en localhost
        const sessionPayload = {
            checkout_version: '2',
            name: paymentData.merchantName,
            description: paymentData.description,
            currency: paymentData.currency,
            amount: paymentData.amount,
            lang: paymentData.lang || 'ES',
            country: paymentData.country || 'CO',
            ip: paymentData.clientIp,
            test: paymentData.test === true,
            method: 'POST',
            billing: {
                email: paymentData.billing?.email || '',
                name: billingName,
                address: paymentData.billing?.address || '',
                typeDoc: paymentData.billing?.typeDoc || 'CC',
                numberDoc: paymentData.billing?.numberDoc || '',
                callingCode: paymentData.billing?.callingCode || '+57',
                mobilePhone: paymentData.billing?.mobilePhone || ''
            },
            extras: {
                extra1: paymentData.orderId || '',
                extra2: paymentData.planId || '',
                extra3: paymentData.userId || '',
                extra4: paymentData.email || '',
                extra5: paymentData.planName || ''
            },
            methodsDisable: paymentData.methodsDisable || []
        };

        // SOLO agregar URLs en PRODUCTION (no en desarrollo con ngrok)
// En desarrollo, ePayco usará sus defaults y hará POST al webhook automáticamente
if (process.env.NODE_ENV === 'production') {
  if (process.env.EPAYCO_RESPONSE_URL && process.env.EPAYCO_CONFIRMATION_URL) {
    sessionPayload.response = process.env.EPAYCO_RESPONSE_URL;
    sessionPayload.confirmation = process.env.EPAYCO_CONFIRMATION_URL;
    console.log('✅ URLs configuradas (Producción):');
    console.log('   Response:', process.env.EPAYCO_RESPONSE_URL);
    console.log('   Confirmation:', process.env.EPAYCO_CONFIRMATION_URL);
  }
} else {
  console.log('ℹ️  Desarrollo: ePayco usará webhooks por defecto');
}



        console.log('📤 Creando sesión en ePayco...');

        const response = await axios.post(
            `${process.env.EPAYCO_APIFY_URL}/payment/session/create`,
            sessionPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Acceder correctamente a los datos
        if (response.data && response.data.data && response.data.data.sessionId) {
            console.log('✅ SessionId obtenido exitosamente');
            return {
                sessionId: response.data.data.sessionId,
                token: response.data.data.token
            };
        } else {
            console.error('❌ Respuesta de ePayco sin sessionId:', response.data);
            throw new Error('ePayco no retornó un sessionId válido');
        }

    } catch (error) {
        console.error('❌ Error creando sesión:', error.response?.data || error.message);

        // Si es error 401 (token expirado) y tenemos reintentos disponibles
        if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
            console.log(`🔄 Token expirado, reintento ${retryCount + 1}/${MAX_RETRIES}...`);

            // Forzar renovación del token
            apifyToken = null;
            tokenExpiration = null;

            // Esperar un poco antes de reintentar (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Reintentar
            return createCheckoutSession(paymentData, retryCount + 1);
        }

        throw new Error('No se pudo crear la sesión de checkout: ' + error.message);
    }
}



module.exports = {
    getApifyToken,
    createCheckoutSession,
    getClientIp
};
